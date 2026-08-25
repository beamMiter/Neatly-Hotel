import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { createClient } from "@/server/db/supabase-server";
import type { ChatbotFaq, ChatbotSuggestion, ChatbotSearchState } from "@/types/chatbot";
import {
  emptyChatbotSearchState,
  getChatbotRoomInformation,
  getMissingChatbotSearchFields,
  isValidChatbotDateRange,
  mergeChatbotSearchState,
  searchAvailableChatbotRooms,
} from "@/server/queries/chatbot.query";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import { getPublishedChatbotContent } from "@/server/queries/chatbot-cms.query";
import { buildChatbotResponse } from "@/server/services/chatbot-response.service";
import { faqAnswers as managedFaqAnswers, findManagedFaq as matchManagedFaq } from "@/server/services/chatbot-faq.service";
import { analyzeLocally as analyzeIntentLocally, findHandoffReason as detectHandoffReason, normalizeSearchState as normalizeIntentSearchState } from "@/server/services/chatbot-intent.service";
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
  })
  .strict();

type Intent = "faq" | "search_room" | "unknown";
type FaqTopic = "check_in" | "facilities" | "location" | "contact" | "other";

type Analysis = {
  intent: Intent;
  faqTopic: FaqTopic;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};

type ResponseMode = "managed_suggestion" | "managed_faq" | "room_information" | "gemini" | "gemini_fallback" | "demo";
type HandoffReason = "explicit_agent_request" | "sensitive_request" | "repeated_question" | "unanswered";

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
    checkIn: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    checkOut: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    guests: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    budget: { type: ["number", "null"], minimum: 1 },
  },
  required: ["intent", "faqTopic", "checkIn", "checkOut", "guests", "budget"],
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

async function getChatbotContent(): Promise<{ faqs: ChatbotFaq[]; autoReply: string | null }> {
  try { return await getPublishedChatbotContent(); } catch { return { faqs: [], autoReply: null }; }
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function findHandoffReason(message: string, messages: Message[]): HandoffReason | null {
  const normalized = normalizeForMatch(message);
  const explicitlyRequestsAgent = [
    "คุยกับเจ้าหน้าที่",
    "ติดต่อเจ้าหน้าที่",
    "ขอเจ้าหน้าที่",
    "เจ้าหน้าที่ช่วย",
    "human agent",
    "talk to an agent",
    "speak to staff",
  ].some((phrase) => normalized.includes(normalizeForMatch(phrase)));
  if (explicitlyRequestsAgent) return "explicit_agent_request";

  const sensitiveRequest = [
    "ชำระเงิน", "จ่ายเงิน", "payment", "refund", "ยกเลิก", "cancel", "ร้องเรียน", "complaint", "complain",
  ].some((phrase) => normalized.includes(normalizeForMatch(phrase)));
  if (sensitiveRequest) return "sensitive_request";

  const previousUserMessages = messages.slice(0, -1)
    .filter((item) => item.role === "user")
    .map((item) => normalizeForMatch(item.content));
  if (normalized.length > 0 && previousUserMessages.includes(normalized)) return "repeated_question";

  return null;
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

function findManagedFaq(message: string, faqs: ChatbotFaq[]) {
  const normalizedMessage = normalizeForMatch(message);
  if (!normalizedMessage) return null;

  const ranked = faqs.map((faq) => {
    const phrases = [...faq.keywords, faq.question].map(normalizeForMatch).filter(Boolean);
    const score = phrases.reduce((total, phrase) => {
      if (normalizedMessage.includes(phrase)) return total + 10 + phrase.length;
      const matchingWords = phrase.split(" ").filter((word) => word.length > 1 && normalizedMessage.includes(word));
      return total + matchingWords.length;
    }, 0);
    return { faq, score };
  }).sort((a, b) => b.score - a.score || a.faq.sort_order - b.faq.sort_order);

  return ranked[0]?.score >= 2 ? ranked[0].faq : null;
}

function normalizeSearchState(value: unknown): ChatbotSearchState {
  if (!value || typeof value !== "object") return emptyChatbotSearchState;
  const state = value as Partial<ChatbotSearchState>;
  return {
    checkIn: typeof state.checkIn === "string" ? state.checkIn : null,
    checkOut: typeof state.checkOut === "string" ? state.checkOut : null,
    guests: typeof state.guests === "number" && state.guests > 0 ? state.guests : null,
    budget: typeof state.budget === "number" && state.budget > 0 ? state.budget : null,
  };
}

function isoDate(value: string) {
  const slash = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const iso = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return iso?.[0] ?? null;
}

function analyzeLocally(message: string, hasSearchState: boolean): Analysis {
  const text = message.toLowerCase();
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slashDates = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g) ?? [];
  const allDates = [...dates, ...slashDates].map(isoDate).filter(Boolean) as string[];
  const guestMatch = text.match(/(\d+)\s*(คน|ท่าน|guest)/);
  const budgetMatch = text.match(/(?:งบ|ไม่เกิน|budget)\s*(?:ประมาณ)?\s*([\d,]+)/);
  const searchWords = ["หาห้อง", "ค้นหาห้อง", "ห้องว่าง", "จอง", "เข้าพัก", "งบ", "พักวันที่"];
  let faqTopic: FaqTopic = "other";
  if (text.includes("เช็กอิน") || text.includes("check-in")) faqTopic = "check_in";
  else if (["wifi", "อาหารเช้า", "ที่จอดรถ", "สิ่งอำนวย"].some((word) => text.includes(word))) faqTopic = "facilities";
  else if (["ที่อยู่", "แผนที่", "เดินทาง"].some((word) => text.includes(word))) faqTopic = "location";
  else if (["ติดต่อ", "โทร", "เบอร์"].some((word) => text.includes(word))) faqTopic = "contact";

  const suppliesSearchData = allDates.length > 0 || Boolean(guestMatch) || Boolean(budgetMatch);
  const isSearch =
    searchWords.some((word) => text.includes(word)) ||
    suppliesSearchData ||
    (hasSearchState && faqTopic === "other");
  const isFaq = faqTopic !== "other" || ["โรงแรม", "บริการ"].some((word) => text.includes(word));

  return {
    intent: isSearch ? "search_room" : isFaq ? "faq" : "unknown",
    faqTopic,
    checkIn: allDates[0] ?? null,
    checkOut: allDates[1] ?? null,
    guests: guestMatch ? Number(guestMatch[1]) : null,
    budget: budgetMatch ? Number(budgetMatch[1].replaceAll(",", "")) : null,
  };
}

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<Analysis>;
  return (
    ["faq", "search_room", "unknown"].includes(analysis.intent ?? "") &&
    ["check_in", "facilities", "location", "contact", "other"].includes(analysis.faqTopic ?? "") &&
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
ถ้ากำลังเก็บข้อมูลค้นหาห้องอยู่ ให้คง intent เป็น search_room แม้ข้อความล่าสุดเป็นเพียงวันที่หรือตัวเลข
faqTopic ใช้ check_in, facilities, location, contact หรือ other
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
      : detectHandoffReason(lastMessage.content, validMessages) ?? findHandoffReason(lastMessage.content, validMessages);
    if (ruleBasedHandoff) {
      return responseWithEvent({
        intent: "unknown",
        message: "ฉันจะส่งต่อเรื่องนี้ให้เจ้าหน้าที่ช่วยดูแลต่อค่ะ กด “คุยกับเจ้าหน้าที่” ด้านล่างเพื่อเริ่ม Live Support ได้เลย",
        search: normalizeSearchState(body.search),
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
        return buildChatbotResponse({
          intent: "faq",
          message: suggestion.reply,
          suggestion: suggestion as ChatbotSuggestion,
          search: emptyChatbotSearchState,
          rooms: [],
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
    const managedFaq = matchManagedFaq(lastMessage.content, chatbotContent.faqs) ?? findManagedFaq(lastMessage.content, chatbotContent.faqs);
    if (managedFaq) {
      return responseWithEvent({
        intent: "faq",
        message: managedFaq.answer,
        faqId: managedFaq.id,
        search: emptyChatbotSearchState,
        rooms: [],
        mode: "managed_faq",
      }, {
        requestId: id,
        intent: "faq",
        mode: "managed_faq",
      });
    }

    const hasStoredSearchState = Object.values(currentSearch).some(Boolean);
    const hasSearchHistory = validMessages.slice(0, -1).some((message) =>
      ["ค้นหาห้อง", "หาห้อง", "ห้องว่าง", "จอง", "ข้อมูลเพิ่ม"].some((word) =>
        message.content.toLowerCase().includes(word),
      ),
    );
    let analysis: Analysis;
    let mode: ResponseMode = "demo";
    let fallbackReason: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        analysis = await analyzeWithGemini(validMessages, currentSearch);
        mode = "gemini";
      } catch (error) {
        logApiFailure("chat:gemini", id, error);
        analysis = analyzeIntentLocally(lastMessage.content, hasStoredSearchState || hasSearchHistory);
        mode = "gemini_fallback";
        fallbackReason = geminiFailureReason(error);
      }
    } else {
      analysis = analyzeLocally(lastMessage.content, hasStoredSearchState || hasSearchHistory);
    }

    if (analysis.intent === "search_room") {
      return responseWithEvent({ ...(await searchResponse(analysis, currentSearch)), mode }, {
        requestId: id,
        intent: "search_room",
        mode,
        fallbackReason,
      });
    }
    if (analysis.intent === "faq") {
      return responseWithEvent({
        intent: "faq",
        message: managedFaqAnswers[analysis.faqTopic] ?? faqAnswers[analysis.faqTopic],
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
      message: chatbotContent.autoReply ?? "ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม และจะส่งต่อให้เจ้าหน้าที่ช่วยดูแลต่อ กด “คุยกับเจ้าหน้าที่” เพื่อเริ่ม Live Support ได้เลยค่ะ",
      search: currentSearch,
      rooms: [],
      mode,
      handoff: { reason: "unanswered" },
    }, {
      requestId: id,
      intent: "unknown",
      mode,
      fallbackReason,
      handoffReason: "unanswered",
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
