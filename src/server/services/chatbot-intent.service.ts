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

function assignSearchDates(dates: string[], message: string, current: ChatbotSearchState) {
  if (dates.length >= 2) return { checkIn: dates[0], checkOut: dates[1] };
  const date = dates[0];
  if (!date) return { checkIn: null, checkOut: null };

  const text = normalizeIntentText(message);
  const mentionsCheckOut = ["เช็กเอาต์", "เช็คเอาต์", "check out", "checkout"].some((word) => text.includes(word));
  const mentionsCheckIn = ["เช็กอิน", "เช็คอิน", "check in", "checkin"].some((word) => text.includes(word));
  if (mentionsCheckOut) return { checkIn: current.checkIn, checkOut: date };
  if (mentionsCheckIn) return { checkIn: date, checkOut: current.checkOut };
  if (!current.checkIn) return { checkIn: date, checkOut: null };
  if (!current.checkOut) return { checkIn: current.checkIn, checkOut: date };
  return { checkIn: null, checkOut: null };
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
  const explicitHandoffPhrases = ["คุยกับเจ้าหน้าที่", "ติดต่อเจ้าหน้าที่", "ขอเจ้าหน้าที่", "เจ้าหน้าที่ช่วย", "human agent"];
  const englishHandoffPatterns = [
    /\b(?:chat|talk|speak|connect)\s+(?:(?:me|us)\s+)?(?:to|with)\s+(?:(?:a|an|the|your)\s+)?(?:human\s+)?(?:agent|staff|representative|receptionist)\b/,
    /\b(?:contact|reach)\s+(?:(?:a|an|the|your)\s+)?(?:agent|staff|representative|receptionist)\b/,
  ];
  if (
    explicitHandoffPhrases.some((phrase) => normalized.includes(normalizeIntentText(phrase))) ||
    englishHandoffPatterns.some((pattern) => pattern.test(normalized))
  ) return "explicit_agent_request";
  return null;
}

export function analyzeLocally(message: string, currentSearch: ChatbotSearchState): ChatbotAnalysis {
  const text = message.toLowerCase();
  const normalizedText = normalizeIntentText(message);
  const hasSearchState = currentSearch.phase !== "idle";
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slashDates = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g) ?? [];
  const allDates = [...dates, ...slashDates].map((value) => {
    const match = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value;
  });
  const assignedDates = assignSearchDates(allDates, message, currentSearch);
  const guestMatch = text.match(/(\d+)\s*(คน|ท่าน|guest)/);
  const parsedGuests = guestMatch ? Number(guestMatch[1]) : null;
  const guests = parsedGuests && Number.isInteger(parsedGuests) && parsedGuests <= 20 ? parsedGuests : null;
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
  const isFaq = faqTopic !== "other";
  const hasExplicitSearchIntent =
    explicitSearchWords.some((word) => normalizedText.includes(word)) ||
    searchPatterns.some((pattern) => pattern.test(normalizedText));
  const suppliesSearchData = allDates.length > 0 || Boolean(guestMatch) || Boolean(budgetMatch);
  const hasStrongSearchData =
    allDates.length >= 2 ||
    (allDates.length >= 1 && Boolean(guestMatch)) ||
    (allDates.length >= 1 && Boolean(budgetMatch)) ||
    (Boolean(guestMatch) && Boolean(budgetMatch));
  const isSearch =
    hasExplicitSearchIntent ||
    (!isFaq && (hasSearchState ? suppliesSearchData : hasStrongSearchData));
  const intent: ChatbotIntent = isSearch ? "search_room" : isFaq ? "faq" : "unknown";
  const confidence = intent === "unknown" ? 0 : hasSearchState && suppliesSearchData ? 1 : 0.95;
  return { intent, faqTopic, confidence, checkIn: assignedDates.checkIn, checkOut: assignedDates.checkOut, guests, budget: budgetMatch ? Number(budgetMatch[1].replaceAll(",", "")) : null };
}

export function resolveChatbotAnalysis(
  modelAnalysis: ChatbotAnalysis,
  localAnalysis: ChatbotAnalysis,
  usedGemini: boolean,
): ResolvedChatbotAnalysis {
  if (localAnalysis.intent === "search_room") {
    const analysis: ChatbotAnalysis = {
      intent: "search_room",
      faqTopic: "other",
      confidence: Math.max(localAnalysis.confidence, modelAnalysis.confidence),
      checkIn: localAnalysis.checkIn ?? modelAnalysis.checkIn,
      checkOut: localAnalysis.checkOut ?? modelAnalysis.checkOut,
      guests: localAnalysis.guests ?? modelAnalysis.guests,
      budget: localAnalysis.budget ?? modelAnalysis.budget,
    };

    return {
      analysis,
      isSearchVerified: true,
    };
  }

  const isStrongGeminiSearch = usedGemini && modelAnalysis.intent === "search_room" && modelAnalysis.confidence >= 0.9;
  return { analysis: modelAnalysis, isSearchVerified: isStrongGeminiSearch };
}

export function isVerifiedFaqAnalysis(
  modelAnalysis: ChatbotAnalysis,
  localAnalysis: ChatbotAnalysis,
  usedGemini: boolean,
) {
  if (modelAnalysis.intent !== "faq" || modelAnalysis.faqTopic === "other") return false;
  const localMatches = localAnalysis.intent === "faq" && localAnalysis.faqTopic === modelAnalysis.faqTopic;
  const isStrongGeminiFaq = usedGemini && modelAnalysis.confidence >= 0.9;
  return localMatches || isStrongGeminiFaq;
}
