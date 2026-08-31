import type { ChatbotSearchState } from "@/types/chatbot";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatbotIntent = "faq" | "search_room" | "unknown";
export type FaqTopic = "check_in" | "facilities" | "location" | "contact" | "other";
export type ChatbotAnalysis = {
  intent: ChatbotIntent;
  faqTopic: FaqTopic;
  confidence: number;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};
export type ResolvedChatbotAnalysis = {
  analysis: ChatbotAnalysis;
  isSearchVerified: boolean;
};
export type HandoffReason = "explicit_agent_request" | "sensitive_request" | "repeated_question" | "unanswered";

export function normalizeIntentText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

export function detectExplicitFaqTopic(message: string): FaqTopic {
  const text = normalizeIntentText(message);
  if (["เช็กอิน", "เช็คอิน", "check in", "checkin", "เช็กเอาต์", "เช็คเอาต์", "check out", "checkout"]
    .some((word) => text.includes(word))) return "check_in";
  if (["wifi", "wi fi", "อาหารเช้า", "ที่จอดรถ", "สิ่งอำนวยความสะดวก"]
    .some((word) => text.includes(word))) return "facilities";
  if (["ที่อยู่", "แผนที่", "เดินทาง", "location", "address"]
    .some((word) => text.includes(word))) return "location";
  if (["ติดต่อ", "โทร", "เบอร์", "contact", "phone number"]
    .some((word) => text.includes(word))) return "contact";
  return "other";
}

export function findHandoffReason(message: string, _messages: ChatMessage[]): HandoffReason | null {
  void _messages;
  const normalized = normalizeIntentText(message);
  if (["คุยกับเจ้าหน้าที่", "ติดต่อเจ้าหน้าที่", "ขอเจ้าหน้าที่", "เจ้าหน้าที่ช่วย", "human agent", "talk to an agent", "speak to staff"]
    .some((phrase) => normalized.includes(normalizeIntentText(phrase)))) return "explicit_agent_request";
  return null;
}

export function analyzeLocally(message: string, hasSearchState: boolean): ChatbotAnalysis {
  const text = message.toLowerCase();
  const normalizedText = normalizeIntentText(message);
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slashDates = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g) ?? [];
  const allDates = [...dates, ...slashDates].map((value) => {
    const match = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value;
  });
  const guestMatch = text.match(/(\d+)\s*(คน|ท่าน|guest)/);
  const budgetMatch = text.match(/(?:งบ|ไม่เกิน|budget)\s*(?:ประมาณ)?\s*([\d,]+)/);
  const explicitSearchWords = [
    "หาห้อง",
    "ค้นหาห้อง",
    "ห้องว่าง",
    "จองห้อง",
    "จองที่พัก",
    "งบ",
    "พักวันที่",
    "find a room",
    "book a room",
    "room availability",
    "available room",
    "rooms available",
  ];
  const searchPatterns = [
    /\b(?:book|reserve|find)\s+(?:(?:a|an|the|any|available)\s+)?rooms?\b/,
    /\b(?:search|look)\s+for\s+(?:(?:a|an|the|any|available)\s+)?rooms?\b/,
    /\brooms?\s+(?:availability|available)\b/,
    /\bavailability\s+(?:of|for)\s+rooms?\b/,
    /\bmake\s+(?:a\s+)?reservation\b/,
    /\bhotel\s+reservation\b/,
  ];
  const faqTopic = detectExplicitFaqTopic(message);
  const suppliesSearchData = allDates.length > 0 || Boolean(guestMatch) || Boolean(budgetMatch);
  const isSearch = explicitSearchWords.some((word) => normalizedText.includes(word)) || searchPatterns.some((pattern) => pattern.test(normalizedText)) || suppliesSearchData;
  const isFaq = faqTopic !== "other";
  const intent: ChatbotIntent = isSearch ? "search_room" : isFaq ? "faq" : "unknown";
  const confidence = intent === "unknown" ? 0 : hasSearchState && suppliesSearchData ? 1 : 0.95;
  return { intent, faqTopic, confidence, checkIn: allDates[0] ?? null, checkOut: allDates[1] ?? null, guests: guestMatch ? Number(guestMatch[1]) : null, budget: budgetMatch ? Number(budgetMatch[1].replaceAll(",", "")) : null };
}

export function resolveChatbotAnalysis(
  modelAnalysis: ChatbotAnalysis,
  localAnalysis: ChatbotAnalysis,
  usedGemini: boolean,
): ResolvedChatbotAnalysis {
  if (localAnalysis.intent === "search_room") {
    return {
      analysis: modelAnalysis.intent === "search_room" ? modelAnalysis : localAnalysis,
      isSearchVerified: true,
    };
  }

  const isStrongGeminiSearch = usedGemini && modelAnalysis.intent === "search_room" && modelAnalysis.confidence >= 0.9;
  return { analysis: modelAnalysis, isSearchVerified: isStrongGeminiSearch };
}

export function normalizeSearchState(value: unknown): ChatbotSearchState {
  if (!value || typeof value !== "object") return { checkIn: null, checkOut: null, guests: null, budget: null };
  const state = value as Partial<ChatbotSearchState>;
  return { checkIn: typeof state.checkIn === "string" ? state.checkIn : null, checkOut: typeof state.checkOut === "string" ? state.checkOut : null, guests: typeof state.guests === "number" && state.guests > 0 ? state.guests : null, budget: typeof state.budget === "number" && state.budget > 0 ? state.budget : null };
}
