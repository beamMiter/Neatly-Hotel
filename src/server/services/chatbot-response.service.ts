import { logApiFailure } from "@/server/services/api-security";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import type { ChatbotIntent, HandoffReason } from "@/server/services/chatbot-intent.service";

type ResponseMode = "managed_suggestion" | "managed_faq" | "room_information" | "gemini" | "gemini_fallback" | "demo";

export async function buildChatbotResponse(payload: Record<string, unknown>, event: { requestId: string; intent: ChatbotIntent; mode: ResponseMode; fallbackReason?: string | null; handoffReason?: HandoffReason | null }) {
  try {
    await recordChatbotEvent({ requestId: event.requestId, eventType: event.handoffReason ? "handoff" : "response", intent: event.intent, responseMode: event.mode, fallbackReason: event.fallbackReason ?? null, handoffReason: event.handoffReason ?? null });
  } catch (error) {
    logApiFailure("chat:event", event.requestId, error);
  }
  return Response.json(payload);
}
