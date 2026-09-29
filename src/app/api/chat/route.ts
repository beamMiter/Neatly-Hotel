import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { buildUnknownChatbotMessage } from "@/lib/chatbot-fallback";
import { redactChatbotMessage } from "@/lib/chatbot-redaction";
import { getBangkokDate, normalizeChatbotSearchState, validateChatbotDateRange, type ChatbotDateValidationError } from "@/lib/chatbot-date-validation";
import { createClient } from "@/server/db/supabase-server";
import type { ChatbotResponseMode, ChatbotSearchField, ChatbotSuggestion, ChatbotSearchState } from "@/types/chatbot";
import {
  getChatbotRoomInformation,
  getChatbotSuggestionRooms,
  getMissingChatbotSearchFields,
  mergeChatbotSearchState,
  searchAvailableChatbotRooms,
} from "@/server/queries/chatbot.query";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import { getPublishedChatbotContent } from "@/server/queries/chatbot-cms.query";
import { buildChatbotResponse } from "@/server/services/chatbot-response.service";
import {
  analyzeLocally as analyzeIntentLocally,
  findHandoffReason,
  isVerifiedFaqAnalysis,
  resolveChatbotAnalysis,
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

type ChatbotLocale = "th" | "en";

class GeminiAnalysisError extends Error {
  constructor(readonly reason: "gemini_timeout" | "gemini_quota" | "gemini_unavailable") {
    super(reason);
    this.name = "GeminiAnalysisError";
  }
}

const GEMINI_CONTEXT_MESSAGE_LIMIT = 6;
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
    handoffReason: {
      type: ["string", "null"],
      enum: ["explicit_agent_request", "booking_change", "refund_request", "payment_issue", "complaint", null],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    checkIn: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    checkOut: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    guests: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    budget: { type: ["number", "null"], minimum: 1 },
  },
  required: ["intent", "faqTopic", "handoffReason", "confidence", "checkIn", "checkOut", "guests", "budget"],
} as const;

const faqAnswers: Record<ChatbotLocale, Record<FaqTopic, string>> = {
  th: {
    check_in: "เวลาเช็กอินมาตรฐานคือ 14:00 น. และเช็กเอาต์ภายใน 12:00 น. หากต้องการเข้าพักก่อนเวลา กรุณาแจ้งล่วงหน้าเพื่อให้เจ้าหน้าที่ตรวจสอบค่ะ",
    facilities: "Neatly Hotel มี Wi‑Fi ฟรี ที่จอดรถ อาหารเช้า และบริการทำความสะอาดรายวันค่ะ หากต้องการสอบถามสิ่งอำนวยความสะดวกเฉพาะ แจ้งมาได้เลยนะคะ",
    location: "ข้อมูลแผนที่และที่อยู่จริงยังไม่ได้เชื่อมในระบบทดลองนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันเส้นทางก่อนเดินทางค่ะ",
    contact: "ขณะนี้ช่องทางติดต่อจริงยังไม่ได้ตั้งค่าในระบบทดลอง กรุณาฝากชื่อและช่องทางติดต่อไว้เพื่อให้เจ้าหน้าที่ติดต่อกลับค่ะ",
    other: "ยินดีช่วยตอบข้อมูลทั่วไปเกี่ยวกับ Neatly Hotel ค่ะ คุณสามารถถามเรื่องเวลาเช็กอิน สิ่งอำนวยความสะดวก หรือค้นหาห้องพักได้เลย",
  },
  en: {
    check_in: "Standard check-in is at 2:00 PM and check-out is by 12:00 PM. If you need early check-in, please let us know in advance so our staff can check availability.",
    facilities: "Neatly Hotel offers free Wi-Fi, parking, breakfast, and daily housekeeping. Let me know if you would like to ask about a specific facility.",
    location: "Map and address details are not connected to this demo yet. Please contact our staff to confirm directions before travelling.",
    contact: "Contact details have not been configured in this demo yet. Please leave your name and contact details so our staff can get back to you.",
    other: "I can help with general information about Neatly Hotel, including check-in times, facilities, and room searches.",
  },
};

const fieldLabels: Record<ChatbotLocale, Record<ChatbotSearchField, string>> = {
  th: { checkIn: "วันเช็กอิน", checkOut: "วันเช็กเอาต์", guests: "จำนวนผู้เข้าพัก", budget: "งบประมาณต่อคืน" },
  en: { checkIn: "check-in date", checkOut: "check-out date", guests: "number of guests", budget: "budget per night" },
};

const dateValidationMessages: Record<ChatbotLocale, Record<ChatbotDateValidationError, string>> = {
  th: {
    invalid_check_in: "รูปแบบวันเช็กอินไม่ถูกต้อง กรุณาระบุวันที่ใหม่ เช่น 10/09/2026",
    invalid_check_out: "รูปแบบวันเช็กเอาต์ไม่ถูกต้อง กรุณาระบุวันที่ใหม่ เช่น 12/09/2026",
    check_in_in_past: "วันเช็กอินต้องเป็นวันนี้หรือวันในอนาคต กรุณาระบุวันเช็กอินใหม่ค่ะ",
    check_out_in_past: "วันเช็กเอาต์ต้องเป็นวันนี้หรือวันในอนาคต กรุณาระบุวันเช็กเอาต์ใหม่ค่ะ",
    check_out_not_after_check_in: "วันเช็กเอาต์ต้องอยู่หลังวันเช็กอินค่ะ กรุณาระบุวันเช็กเอาต์ใหม่อีกครั้ง",
  },
  en: {
    invalid_check_in: "The check-in date is invalid. Please enter it again, for example 10/09/2026.",
    invalid_check_out: "The check-out date is invalid. Please enter it again, for example 12/09/2026.",
    check_in_in_past: "The check-in date must be today or later. Please enter a new check-in date.",
    check_out_in_past: "The check-out date must be today or later. Please enter a new check-out date.",
    check_out_not_after_check_in: "The check-out date must be after the check-in date. Please enter a new check-out date.",
  },
};

async function getChatbotContent(): Promise<{ autoReplyTh: string | null; autoReplyEn: string | null }> {
  try { return await getPublishedChatbotContent(); } catch { return { autoReplyTh: null, autoReplyEn: null }; }
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
    mode: ChatbotResponseMode;
    fallbackReason?: string | null;
    handoffReason?: HandoffReason | null;
    messageRedacted: string;
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
      messageRedacted: event.messageRedacted,
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
    (analysis.handoffReason === null || ["explicit_agent_request", "booking_change", "refund_request", "payment_issue", "complaint"].includes(analysis.handoffReason ?? "")) &&
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
  const today = getBangkokDate();
  const conversation = messages
    .slice(-GEMINI_CONTEXT_MESSAGE_LIMIT)
    .map((message) => `${message.role === "user" ? "ผู้ใช้" : "ผู้ช่วย"}: ${message.content}`)
    .join("\n");
  const redactedConversation = conversation
    .split("\n")
    .map(redactChatbotMessage)
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
handoffReason ใช้ explicit_agent_request, booking_change, refund_request, payment_issue, complaint หรือ null
ให้ตั้ง handoffReason เมื่อผู้ใช้ขอคุยกับคน หรือต้องให้เจ้าหน้าที่ทำงานจริง: ยกเลิก/เปลี่ยนการจอง ขอคืนเงิน ปัญหาชำระเงิน หรือร้องเรียน
จับความหมายแม้ผู้ใช้ใช้ถ้อยคำไม่ตรงตัว สะกดผิด หรือใช้ไทยปนอังกฤษ แต่คำถามข้อมูลทั่วไป เช่น วิธีชำระเงินหรือนโยบายยกเลิก ให้ handoffReason เป็น null
คำถามนโยบายที่ไม่มีหมวด เช่น สัตว์เลี้ยง สูบบุหรี่ เด็ก หรือเงินมัดจำ ให้เป็น unknown ห้ามจัดรวมเป็น facilities
คำถามเกี่ยวกับการจอง การสำรองห้อง วิธีจอง หรือเริ่มจอง เช่น book a room, book the room, reserve a room, make a reservation ให้เป็น search_room
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

async function searchResponse(analysis: Analysis, current: ChatbotSearchState, locale: ChatbotLocale) {
  const search = mergeChatbotSearchState(current, {
    checkIn: analysis.checkIn,
    checkOut: analysis.checkOut,
    guests: analysis.guests,
    budget: analysis.budget,
  });

  const dateValidation = validateChatbotDateRange(search);
  if (!dateValidation.valid) {
    const invalidSearch = { ...search };
    if (dateValidation.error === "invalid_check_in" || dateValidation.error === "check_in_in_past") {
      invalidSearch.checkIn = null;
    } else {
      invalidSearch.checkOut = null;
    }

    return {
      intent: "search_room" as const,
      message: dateValidationMessages[locale][dateValidation.error],
      search: { ...invalidSearch, phase: "collecting" as const },
      rooms: [],
    };
  }

  const missing = getMissingChatbotSearchFields(search);
  if (missing.length > 0) {
    const labels = missing.map((field) => fieldLabels[locale][field]);
    return {
      intent: "search_room" as const,
      message: locale === "en"
        ? `Certainly. To find a suitable room, please provide: ${labels.join(", ")}\nExample: 10/09/2026 - 12/09/2026, 2 guests, THB 4,000 per night`
        : `ได้เลยค่ะ เพื่อค้นหาห้องที่เหมาะสม ขอข้อมูลเพิ่ม: ${labels.join(", ")}\nตัวอย่าง: 10/09/2026 - 12/09/2026, 2 คน, งบ 4,000 บาทต่อคืน`,
      search: { ...search, phase: "collecting" as const },
      rooms: [],
    };
  }

  const rooms = await searchAvailableChatbotRooms(search);
  return {
    intent: "search_room" as const,
    message: locale === "en"
      ? rooms.length
        ? `I found ${rooms.length} available room type${rooms.length === 1 ? "" : "s"} for ${search.guests} guest${search.guests === 1 ? "" : "s"}, within a budget of THB ${search.budget?.toLocaleString("en-US")} per night.`
        : "I couldn't find a room for this number of guests within your budget. Try increasing the budget or changing the number of guests."
      : rooms.length
        ? `พบห้องว่าง ${rooms.length} แบบ สำหรับ ${search.guests} ท่าน งบไม่เกิน ${search.budget?.toLocaleString("th-TH")} บาทต่อคืนค่ะ`
        : "ไม่พบห้องที่รองรับจำนวนผู้เข้าพักภายในงบประมาณนี้ ลองเพิ่มงบประมาณหรือปรับจำนวนผู้เข้าพักได้ค่ะ",
    search: { ...search, phase: "results" as const },
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
    const locale: ChatbotLocale = body.language === "en" ? "en" : "th";
    const validMessages: Message[] = body.messages.slice(-12);
    const lastMessage = validMessages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "กรุณาส่งข้อความที่ถูกต้อง" }, { status: 400 });
    }
    const messageRedacted = redactChatbotMessage(lastMessage.content);

    const ruleBasedHandoff = body.suggestionId
      ? null
      : findHandoffReason(lastMessage.content, validMessages);
    if (ruleBasedHandoff) {
      return responseWithEvent({
        intent: "unknown",
        message: locale === "en"
          ? "I'll pass this to our staff. Select “Talk to an agent” below to start live support."
          : "ฉันจะส่งต่อเรื่องนี้ให้เจ้าหน้าที่ช่วยดูแลต่อค่ะ กด “คุยกับเจ้าหน้าที่” ด้านล่างเพื่อเริ่ม Live Support ได้เลย",
        search: normalizeChatbotSearchState(body.search),
        rooms: [],
        mode: "demo",
        handoff: { reason: ruleBasedHandoff },
      }, {
        requestId: id,
        intent: "unknown",
        mode: "demo",
        handoffReason: ruleBasedHandoff,
        messageRedacted,
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
        const suggestionSearch = normalizeChatbotSearchState(body.search);
        const suggestionDateValidation = validateChatbotDateRange(suggestionSearch);
        if (localizedSuggestion.format === "Room type" && !suggestionDateValidation.valid) {
          const invalidSearch = { ...suggestionSearch };
          if (suggestionDateValidation.error === "invalid_check_in" || suggestionDateValidation.error === "check_in_in_past") {
            invalidSearch.checkIn = null;
          } else {
            invalidSearch.checkOut = null;
          }
          invalidSearch.phase = "collecting";

          return buildChatbotResponse({
            intent: "search_room",
            message: dateValidationMessages[locale][suggestionDateValidation.error],
            search: invalidSearch,
            rooms: [],
            mode: "managed_suggestion",
          }, {
            requestId: id,
            intent: "search_room",
            mode: "managed_suggestion",
            messageRedacted,
          });
        }
        const rooms = localizedSuggestion.format === "Room type"
          ? await getChatbotSuggestionRooms(localizedSuggestion.rooms, suggestionSearch)
          : [];
        const responseSearch = localizedSuggestion.format === "Room type" && suggestionSearch.checkIn && suggestionSearch.checkOut && suggestionSearch.guests
          ? { ...suggestionSearch, phase: "results" as const }
          : suggestionSearch;

        return buildChatbotResponse({
          intent: "faq",
          message: localizedSuggestion.reply,
          suggestion: localizedSuggestion,
          search: responseSearch,
          rooms,
          mode: "managed_suggestion",
        }, {
          requestId: id,
          intent: "faq",
          mode: "managed_suggestion",
          messageRedacted,
        });
      }
    }

    const currentSearch = normalizeChatbotSearchState(body.search);
    const roomInformation = await getChatbotRoomInformation(lastMessage.content);
    if (roomInformation) {
      return responseWithEvent({
        intent: "faq",
        message: `${roomInformation.name}\n${roomInformation.description || (locale === "en" ? "See the room details, price, size, bed, and facilities below." : "ดูรายละเอียดห้อง ราคา ขนาด เตียง และสิ่งอำนวยความสะดวกได้ด้านล่างค่ะ")}`,
        search: currentSearch,
        rooms: [roomInformation],
        mode: "room_information",
      }, {
        requestId: id,
        intent: "faq",
        mode: "room_information",
        messageRedacted,
      });
    }

    const chatbotContent = await getChatbotContent();
    const localAnalysis = analyzeIntentLocally(lastMessage.content, currentSearch);
    let analysis: Analysis;
    let geminiAnalysis: Analysis | null = null;
    let mode: ChatbotResponseMode = "demo";
    let fallbackReason: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        geminiAnalysis = await analyzeWithGemini(validMessages, currentSearch);
        analysis = geminiAnalysis;
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

    const resolved = resolveChatbotAnalysis(analysis, localAnalysis, mode === "gemini");
    analysis = resolved.analysis;
    const passesConfidence = analysis.confidence >= 0.8;
    const hasVerifiedFaqTopic = isVerifiedFaqAnalysis(analysis, localAnalysis, mode === "gemini");

    console.info("[chat:intent]", {
      requestId: id,
      mode,
      gemini: geminiAnalysis ? {
        intent: geminiAnalysis.intent,
        faqTopic: geminiAnalysis.faqTopic,
        confidence: geminiAnalysis.confidence,
        handoffReason: geminiAnalysis.handoffReason,
        extracted: {
          checkIn: Boolean(geminiAnalysis.checkIn),
          checkOut: Boolean(geminiAnalysis.checkOut),
          guests: Boolean(geminiAnalysis.guests),
          budget: Boolean(geminiAnalysis.budget),
        },
      } : null,
      local: { intent: localAnalysis.intent, faqTopic: localAnalysis.faqTopic, confidence: localAnalysis.confidence, handoffReason: localAnalysis.handoffReason },
      resolved: { intent: analysis.intent, confidence: analysis.confidence, handoffReason: analysis.handoffReason, searchVerified: resolved.isSearchVerified, faqVerified: hasVerifiedFaqTopic },
      fallbackReason,
    });

    const canServeLocallyDuringQuota =
      (localAnalysis.intent === "search_room" && localAnalysis.confidence >= 0.8 && resolved.isSearchVerified) ||
      (localAnalysis.intent === "faq" && localAnalysis.confidence >= 0.8 && hasVerifiedFaqTopic);

    if (fallbackReason === "gemini_quota" && !canServeLocallyDuringQuota) {
      const handoffReason = localAnalysis.handoffReason ?? "unanswered";
      return responseWithEvent({
        intent: "unknown",
        message: locale === "en"
          ? "Sorry, the automated assistant is temporarily unavailable. Please try again later or select \"Talk to an agent\" below for immediate help."
          : "ขออภัยค่ะ ขณะนี้ผู้ช่วยอัตโนมัติไม่พร้อมใช้งานชั่วคราว คุณสามารถลองใหม่ภายหลัง หรือเลือก “คุยกับเจ้าหน้าที่” เพื่อรับความช่วยเหลือได้ทันที",
        search: currentSearch,
        rooms: [],
        mode,
        handoff: { reason: handoffReason },
      }, {
        requestId: id,
        intent: "unknown",
        mode,
        fallbackReason,
        handoffReason,
        messageRedacted,
      });
    }

    if (analysis.handoffReason && passesConfidence) {
      return responseWithEvent({
        intent: "unknown",
        message: locale === "en"
          ? "This needs help from our team. Select “Talk to an agent” below to start live support."
          : "เรื่องนี้ต้องให้เจ้าหน้าที่ช่วยดูแลค่ะ กด “คุยกับเจ้าหน้าที่” ด้านล่างเพื่อเริ่ม Live Support ได้เลย",
        search: currentSearch,
        rooms: [],
        mode,
        handoff: { reason: analysis.handoffReason },
      }, {
        requestId: id,
        intent: "unknown",
        mode,
        fallbackReason,
        handoffReason: analysis.handoffReason,
        messageRedacted,
      });
    }
    if (analysis.intent === "search_room" && passesConfidence && resolved.isSearchVerified) {
      return responseWithEvent({ ...(await searchResponse(analysis, currentSearch, locale)), mode }, {
        requestId: id,
        intent: "search_room",
        mode,
        fallbackReason,
        messageRedacted,
      });
    }
    if (analysis.intent === "faq" && analysis.faqTopic === "contact" && passesConfidence && hasVerifiedFaqTopic) {
      return responseWithEvent({
        intent: "unknown",
        message: locale === "en"
          ? "I’ll connect you with our team. Select “Talk to an agent” below to start live support."
          : "ฉันจะส่งต่อให้เจ้าหน้าที่ดูแลค่ะ กด “คุยกับเจ้าหน้าที่” ด้านล่างเพื่อเริ่ม Live Support ได้เลย",
        search: currentSearch,
        rooms: [],
        mode,
        handoff: { reason: "explicit_agent_request" },
      }, {
        requestId: id,
        intent: "unknown",
        mode,
        fallbackReason,
        handoffReason: "explicit_agent_request",
        messageRedacted,
      });
    }
    if (analysis.intent === "faq" && passesConfidence && hasVerifiedFaqTopic) {
      return responseWithEvent({
        intent: "faq",
        message: faqAnswers[locale][analysis.faqTopic],
        search: currentSearch,
        rooms: [],
        mode,
      }, {
        requestId: id,
        intent: "faq",
        mode,
        fallbackReason,
        messageRedacted,
      });
    }

    return responseWithEvent({
      intent: "unknown",
      message: buildUnknownChatbotMessage(body.language === "en" ? chatbotContent.autoReplyEn : chatbotContent.autoReplyTh),
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
      messageRedacted,
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
