import type { ChatbotSearchState } from "@/types/chatbot";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatbotIntent = "faq" | "search_room" | "unknown";
export type FaqTopic = "check_in" | "facilities" | "location" | "contact" | "other";
export type ChatbotAnalysis = {
  intent: ChatbotIntent;
  faqTopic: FaqTopic;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};
export type HandoffReason = "explicit_agent_request" | "sensitive_request" | "repeated_question" | "unanswered";

export function normalizeIntentText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function findHandoffReason(message: string, messages: ChatMessage[]): HandoffReason | null {
  const normalized = normalizeIntentText(message);
  if (["คุยกับเจ้าหน้าที่", "ติดต่อเจ้าหน้าที่", "ขอเจ้าหน้าที่", "เจ้าหน้าที่ช่วย", "human agent", "talk to an agent", "speak to staff"]
    .some((phrase) => normalized.includes(normalizeIntentText(phrase)))) return "explicit_agent_request";
  if (["ชำระเงิน", "จ่ายเงิน", "payment", "refund", "ยกเลิก", "cancel", "ร้องเรียน", "complaint", "complain"]
    .some((phrase) => normalized.includes(normalizeIntentText(phrase)))) return "sensitive_request";
  const previousUserMessages = messages.slice(0, -1).filter((item) => item.role === "user").map((item) => normalizeIntentText(item.content));
  return normalized.length > 0 && previousUserMessages.includes(normalized) ? "repeated_question" : null;
}

export function analyzeLocally(message: string, hasSearchState: boolean): ChatbotAnalysis {
  const text = message.toLowerCase();
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slashDates = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g) ?? [];
  const allDates = [...dates, ...slashDates].map((value) => {
    const match = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value;
  });
  const guestMatch = text.match(/(\d+)\s*(คน|ท่าน|guest)/);
  const budgetMatch = text.match(/(?:งบ|ไม่เกิน|budget)\s*(?:ประมาณ)?\s*([\d,]+)/);
  const searchWords = ["หาห้อง", "ค้นหาห้อง", "ห้องว่าง", "จอง", "เข้าพัก", "งบ", "พักวันที่"];
  let faqTopic: FaqTopic = "other";
  if (text.includes("เช็กอิน") || text.includes("check-in")) faqTopic = "check_in";
  else if (["wifi", "อาหารเช้า", "ที่จอดรถ", "สิ่งอำนวย"].some((word) => text.includes(word))) faqTopic = "facilities";
  else if (["ที่อยู่", "แผนที่", "เดินทาง"].some((word) => text.includes(word))) faqTopic = "location";
  else if (["ติดต่อ", "โทร", "เบอร์"].some((word) => text.includes(word))) faqTopic = "contact";
  const isSearch = searchWords.some((word) => text.includes(word)) || allDates.length > 0 || Boolean(guestMatch) || Boolean(budgetMatch) || (hasSearchState && faqTopic === "other");
  const isFaq = faqTopic !== "other" || ["โรงแรม", "บริการ"].some((word) => text.includes(word));
  return { intent: isSearch ? "search_room" : isFaq ? "faq" : "unknown", faqTopic, checkIn: allDates[0] ?? null, checkOut: allDates[1] ?? null, guests: guestMatch ? Number(guestMatch[1]) : null, budget: budgetMatch ? Number(budgetMatch[1].replaceAll(",", "")) : null };
}

export function normalizeSearchState(value: unknown): ChatbotSearchState {
  if (!value || typeof value !== "object") return { checkIn: null, checkOut: null, guests: null, budget: null };
  const state = value as Partial<ChatbotSearchState>;
  return { checkIn: typeof state.checkIn === "string" ? state.checkIn : null, checkOut: typeof state.checkOut === "string" ? state.checkOut : null, guests: typeof state.guests === "number" && state.guests > 0 ? state.guests : null, budget: typeof state.budget === "number" && state.budget > 0 ? state.budget : null };
}
