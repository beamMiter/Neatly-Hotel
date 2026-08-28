import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { buildUnknownChatbotMessage } from "@/lib/chatbot-fallback";
import { createClient } from "@/server/db/supabase-server";
import type { ChatbotSuggestion, ChatbotSearchState } from "@/types/chatbot";
import {
  emptyChatbotSearchState,
  getChatbotRoomInformation,
  getChatbotSuggestionRooms,
  getMissingChatbotSearchFields,
  isValidChatbotDateRange,
  mergeChatbotSearchState,
  searchAvailableChatbotRooms,
} from "@/server/queries/chatbot.query";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import { getPublishedChatbotContent } from "@/server/queries/chatbot-cms.query";
import { buildChatbotResponse } from "@/server/services/chatbot-response.service";
import {
  analyzeLocally as analyzeIntentLocally,
  detectExplicitFaqTopic,
  findHandoffReason,
  normalizeSearchState as normalizeIntentSearchState,
  type ChatbotAnalysis as Analysis,
  type ChatbotIntent as Intent,
  type FaqTopic,
  type HandoffReason,
} from "@/server/services/chatbot-intent.service";
import {
  checkRateLimits,
  hasOversizedBody,
  InvalidJsonError,
  logApiFailure,
  PayloadTooLargeError,
  rateLimitExceededResponse,
  RateLimitUnavailableError,
  rateLimitUnavailableResponse,
  readJsonBody,
  requestId,
} from "@/server/services/api-security";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const MAX_REQUEST_BYTES = 64 * 1024;
const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(800),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    search: z.unknown().optional(),
    suggestionId: z.string().trim().min(1).max(100).optional(),
    language: z.enum(["th", "en"]).optional(),
  })
  .strict();

type ResponseMode = "managed_suggestion" | "room_information" | "gemini" | "gemini_fallback" | "demo";

class GeminiAnalysisError extends Error {
  constructor(readonly reason: "gemini_timeout" | "gemini_quota" | "gemini_unavailable") {
    super(reason);
    this.name = "GeminiAnalysisError";
  }
}

const GEMINI_CONTEXT_MESSAGE_LIMIT = 6;
const GEMINI_CONTEXT_MESSAGE_CHARS = 450;
const GEMINI_TIMEOUT_MS = 8_000;

const intentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["faq", "search_room", "unknown"] },
    faqTopic: {
      type: "string",
      enum: ["check_in", "facilities", "location", "contact", "other"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    checkIn: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    checkOut: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    guests: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    budget: { type: ["number", "null"], minimum: 1 },
  },
  required: ["intent", "faqTopic", "confidence", "checkIn", "checkOut", "guests", "budget"],
} as const;

const faqAnswers: Record<FaqTopic, string> = {
  check_in: "เวลาเช็กอินมาตรฐานคือ 14:00 น. และเช็กเอาต์ภายใน 12:00 น. หากต้องการเข้าพักก่อนเวลา กรุณาแจ้งล่วงหน้าเพื่อให้เจ้าหน้าที่ตรวจสอบค่ะ",
  facilities: "Neatly Hotel มี Wi‑Fi ฟรี ที่จอดรถ อาหารเช้า และบริการทำความสะอาดรายวันค่ะ หากต้องการสอบถามสิ่งอำนวยความสะดวกเฉพาะ แจ้งมาได้เลยนะคะ",
  location: "ข้อมูลแผนที่และที่อยู่จริงยังไม่ได้เชื่อมในระบบทดลองนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันเส้นทางก่อนเดินทางค่ะ",
  contact: "ขณะนี้ช่องทางติดต่อจริงยังไม่ได้ตั้งค่าในระบบทดลอง กรุณาฝากชื่อและช่องทางติดต่อไว้เพื่อให้เจ้าหน้าที่ติดต่อกลับค่ะ",
  other: "ยินดีช่วยตอบข้อมูลทั่วไปเกี่ยวกับ Neatly Hotel ค่ะ คุณสามารถถามเรื่องเวลาเช็กอิน สิ่งอำนวยความสะดวก หรือค้นหาห้องพักได้เลย",
};

const fieldLabels: Record<keyof ChatbotSearchState, string> = {
  checkIn: "วันเช็กอิน",
  checkOut: "วันเช็กเอาต์",
  guests: "จำนวนผู้เข้าพัก",
  budget: "งบประมาณต่อคืน",
};

async function getChatbotContent(): Promise<{ autoReplyTh: string | null; autoReplyEn: string | null }> {
  try { return await getPublishedChatbotContent(); } catch { return { autoReplyTh: null, autoReplyEn: null }; }
}

function redactForGemini(value: string) {
  return value
    .replace(/(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/g, "[REDACTED_PHONE]")
    .replace(/\b(?:booking\s*(?:code|no\.?|number)?\s*[:#-]?\s*[a-z0-9_-]{4,}|(?:bk|res|book)[-_]?[a-z0-9]{4,})\b/gi, "[REDACTED_BOOKING_CODE]")
    .slice(0, GEMINI_CONTEXT_MESSAGE_CHARS);
}

function geminiFailureReason(error: unknown): GeminiAnalysisError["reason"] {
  if (error instanceof GeminiAnalysisError) return error.reason;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("quota") || message.includes("resource_exhausted") || message.includes("429")) return "gemini_quota";
  return "gemini_unavailable";
}

async function responseWithEvent(
  payload: Record<string, unknown>,
  event: {
    requestId: string;
    intent: Intent;
    mode: ResponseMode;
    fallbackReason?: string | null;
    handoffReason?: HandoffReason | null;
  },
) {
  try {
    await recordChatbotEvent({
      requestId: event.requestId,
      eventType: event.handoffReason ? "handoff" : "response",
      intent: event.intent,
      responseMode: event.mode,
      fallbackReason: event.fallbackReason ?? null,
      handoffReason: event.handoffReason ?? null,
    });
  } catch (error) {
    logApiFailure("chat:event", event.requestId, error);
  }
  return Response.json(payload);
}

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<Analysis>;
  return (
    ["faq", "search_room", "unknown"].includes(analysis.intent ?? "") &&
    ["check_in", "facilities", "location", "contact", "other"].includes(analysis.faqTopic ?? "") &&
    typeof analysis.confidence === "number" && analysis.confidence >= 0 && analysis.confidence <= 1 &&
    (analysis.checkIn === null || typeof analysis.checkIn === "string") &&
    (analysis.checkOut === null || typeof analysis.checkOut === "string") &&
    (analysis.guests === null || typeof analysis.guests === "number") &&
    (analysis.budget === null || typeof analysis.budget === "number")
  );
}

async function analyzeWithGemini(messages: Message[], state: ChatbotSearchState): Promise<Analysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const conversation = messages
    .slice(-GEMINI_CONTEXT_MESSAGE_LIMIT)
    .map((message) => `${message.role === "user" ? "ผู้ใช้" : "ผู้ช่วย"}: ${message.content}`)
    .join("\n");
  const redactedConversation = conversation
    .split("\n")
    .map(redactForGemini)
    .join("\n");
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new GeminiAnalysisError("gemini_timeout")), GEMINI_TIMEOUT_MS);
  });
  const request = ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    contents: `จำแนก intent และดึงข้อมูลค้นหาห้องจากบทสนทนาโรงแรม
วันนี้คือ ${today} แปลงวันที่เป็น YYYY-MM-DD
intent มี faq, search_room, unknown เท่านั้น
confidence อยู่ระหว่าง 0 ถึง 1 หากคำถามไม่ตรงหมวดที่รองรับหรือไม่แน่ใจ ให้ใช้ unknown และ confidence ต่ำกว่า 0.8
ถ้ากำลังเก็บข้อมูลค้นหาห้องอยู่ ให้คง intent เป็น search_room แม้ข้อความล่าสุดเป็นเพียงวันที่หรือตัวเลข
faqTopic ใช้ check_in, facilities, location, contact หรือ other
คำถามนโยบายที่ไม่มีหมวด เช่น สัตว์เลี้ยง สูบบุหรี่ เด็ก หรือเงินมัดจำ ให้เป็น unknown ห้ามจัดรวมเป็น facilities
คืนเฉพาะข้อมูลที่ผู้ใช้ระบุจริง ห้ามเดาห้อง ราคา หรือจำนวนผู้เข้าพัก
search state ปัจจุบัน: ${JSON.stringify(state)}

บทสนทนา:
${redactedConversation}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: intentSchema,
      temperature: 0,
      // Gemini 3 Flash uses part of this budget for internal reasoning. A low
      // limit can truncate the JSON even though the final payload is small.
      maxOutputTokens: 1024,
    },
  });
  let response: Awaited<typeof request>;
  try {
    response = await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.text) throw new Error("Gemini returned an empty response");
  const parsed: unknown = JSON.parse(response.text);
  if (!isAnalysis(parsed)) throw new Error("Gemini returned an invalid intent response");
  return parsed;
}

async function searchResponse(analysis: Analysis, current: ChatbotSearchState) {
  const search = mergeChatbotSearchState(current, {
    checkIn: analysis.checkIn,
    checkOut: analysis.checkOut,
    guests: analysis.guests,
    budget: analysis.budget,
  });

  if (!isValidChatbotDateRange(search)) {
    return {
      intent: "search_room" as const,
      message: "วันเช็กเอาต์ต้องอยู่หลังวันเช็กอินค่ะ กรุณาระบุวันที่ใหม่อีกครั้ง",
      search: { ...search, checkIn: null, checkOut: null },
      rooms: [],
    };
  }

  const missing = getMissingChatbotSearchFields(search);
  if (missing.length > 0) {
    const labels = missing.map((field) => fieldLabels[field]);
    return {
      intent: "search_room" as const,
      message: `ได้เลยค่ะ เพื่อค้นหาห้องที่เหมาะสม ขอข้อมูลเพิ่ม: ${labels.join(", ")}\nตัวอย่าง: 10/09/2026 - 12/09/2026, 2 คน, งบ 4,000 บาทต่อคืน`,
      search,
      rooms: [],
    };
  }

  const rooms = await searchAvailableChatbotRooms(search);
  return {
    intent: "search_room" as const,
    message: rooms.length
      ? `พบห้องว่าง ${rooms.length} แบบ สำหรับ ${search.guests} ท่าน งบไม่เกิน ${search.budget?.toLocaleString("th-TH")} บาทต่อคืนค่ะ`
      : "ไม่พบห้องที่รองรับจำนวนผู้เข้าพักภายในงบประมาณนี้ ลองเพิ่มงบประมาณหรือปรับจำนวนผู้เข้าพักได้ค่ะ",
    search,
    rooms,
  };
}

export async function POST(request: Request) {
  const id = requestId(request);
  if (hasOversizedBody(request, MAX_REQUEST_BYTES)) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }

  try {
    const limit = await checkRateLimits(request, [
      { scope: "chat:ip:minute", limit: 10, windowSeconds: 60 },
      { scope: "chat:ip:hour", limit: 60, windowSeconds: 60 * 60 },
    ]);
    if (!limit.allowed) return rateLimitExceededResponse(limit.retryAfterSeconds);

    const rawBody = await readJsonBody(request, MAX_REQUEST_BYTES);
    const parsedBody = chatRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }

    const body = parsedBody.data;
    const validMessages: Message[] = body.messages.slice(-12);
    const lastMessage = validMessages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "กรุณาส่งข้อความที่ถูกต้อง" }, { status: 400 });
    }

    const ruleBasedHandoff = body.suggestionId
      ? null
      : findHandoffReason(lastMessage.content, validMessages);
    if (ruleBasedHandoff) {
      return responseWithEvent({
        intent: "unknown",
        message: "ฉันจะส่งต่อเรื่องนี้ให้เจ้าหน้าที่ช่วยดูแลต่อค่ะ กด “คุยกับเจ้าหน้าที่” ด้านล่างเพื่อเริ่ม Live Support ได้เลย",
        search: normalizeIntentSearchState(body.search),
        rooms: [],
        mode: "demo",
        handoff: { reason: ruleBasedHandoff },
      }, {
        requestId: id,
        intent: "unknown",
        mode: "demo",
        handoffReason: ruleBasedHandoff,
      });
    }

    if (body.suggestionId) {
      const supabase = await createClient();
      const { data: suggestion, error } = await supabase
        .from("chatbot_suggestions")
        .select("*")
        .eq("id", body.suggestionId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) logApiFailure("chat:suggestion", id, error);
      if (suggestion) {
        const managedSuggestion = suggestion as ChatbotSuggestion;
        const translation = body.language ? managedSuggestion.translations?.[body.language] : undefined;
        const localizedSuggestion = translation ? {
          ...managedSuggestion,
          topic: translation.topic,
          reply: translation.reply,
          button_name: translation.button_name,
          options: translation.options,
        } : managedSuggestion;
        const suggestionSearch = normalizeIntentSearchState(body.search);
        const rooms = localizedSuggestion.format === "Room type"
          ? await getChatbotSuggestionRooms(localizedSuggestion.rooms, suggestionSearch)
          : [];

        return buildChatbotResponse({
          intent: "faq",
          message: localizedSuggestion.reply,
          suggestion: localizedSuggestion,
          search: suggestionSearch,
          rooms,
          mode: "managed_suggestion",
        }, {
          requestId: id,
          intent: "faq",
          mode: "managed_suggestion",
        });
      }
    }

    const currentSearch = normalizeIntentSearchState(body.search);
    const roomInformation = await getChatbotRoomInformation(lastMessage.content);
    if (roomInformation) {
      return responseWithEvent({
        intent: "faq",
        message: `${roomInformation.name}\n${roomInformation.description || "ดูรายละเอียดห้อง ราคา ขนาด เตียง และสิ่งอำนวยความสะดวกได้ด้านล่างค่ะ"}`,
        search: currentSearch,
        rooms: [roomInformation],
        mode: "room_information",
      }, {
        requestId: id,
        intent: "faq",
        mode: "room_information",
      });
    }

    const chatbotContent = await getChatbotContent();
    const hasStoredSearchState = Object.values(currentSearch).some(Boolean);
    const hasSearchHistory = validMessages.slice(0, -1).some((message) =>
      ["ค้นหาห้อง", "หาห้อง", "ห้องว่าง", "จอง", "ข้อมูลเพิ่ม"].some((word) =>
        message.content.toLowerCase().includes(word),
      ),
    );
    const localAnalysis = analyzeIntentLocally(lastMessage.content, hasStoredSearchState || hasSearchHistory);
    let analysis: Analysis;
    let mode: ResponseMode = "demo";
    let fallbackReason: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        analysis = await analyzeWithGemini(validMessages, currentSearch);
        mode = "gemini";
      } catch (error) {
        logApiFailure("chat:gemini", id, error);
        analysis = localAnalysis;
        mode = "gemini_fallback";
        fallbackReason = geminiFailureReason(error);
      }
    } else {
      analysis = localAnalysis;
    }

    const passesConfidence = analysis.confidence >= 0.8;
    const hasVerifiedSearchIntent = localAnalysis.intent === "search_room";
    const hasVerifiedFaqTopic =
      analysis.faqTopic !== "other" && detectExplicitFaqTopic(lastMessage.content) === analysis.faqTopic;

    if (analysis.intent === "search_room" && passesConfidence && hasVerifiedSearchIntent) {
      return responseWithEvent({ ...(await searchResponse(analysis, currentSearch)), mode }, {
        requestId: id,
        intent: "search_room",
        mode,
        fallbackReason,
      });
    }
    if (analysis.intent === "faq" && passesConfidence && hasVerifiedFaqTopic) {
      return responseWithEvent({
        intent: "faq",
        message: faqAnswers[analysis.faqTopic],
        search: emptyChatbotSearchState,
        rooms: [],
        mode,
      }, {
        requestId: id,
        intent: "faq",
        mode,
        fallbackReason,
      });
    }

    return responseWithEvent({
      intent: "unknown",
      message: buildUnknownChatbotMessage(body.language === "en" ? chatbotContent.autoReplyEn : chatbotContent.autoReplyTh),
      search: currentSearch,
      rooms: [],
      mode,
    }, {
      requestId: id,
      intent: "unknown",
      mode,
      fallbackReason,
    });
  } catch (error) {
    logApiFailure("chat", id, error);
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
    if (error instanceof InvalidJsonError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailableResponse();
    return Response.json({ error: "ระบบแชตขัดข้องชั่วคราว กรุณาลองใหม่" }, { status: 500 });
  }
}
