import { logApiFailure } from "@/server/services/api-security";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import type { ChatbotIntent, HandoffReason } from "@/server/services/chatbot-intent.service";
import type { ChatbotResponseMode } from "@/types/chatbot";

export async function buildChatbotResponse(payload: Record<string, unknown>, event: { requestId: string; intent: ChatbotIntent; mode: ChatbotResponseMode; fallbackReason?: string | null; handoffReason?: HandoffReason | null; messageRedacted: string }) {
  try {
    await recordChatbotEvent({ requestId: event.requestId, eventType: event.handoffReason ? "handoff" : "response", intent: event.intent, responseMode: event.mode, fallbackReason: event.fallbackReason ?? null, handoffReason: event.handoffReason ?? null, messageRedacted: event.messageRedacted });
  } catch (error) {
    logApiFailure("chat:event", event.requestId, error);
  }
  return Response.json(payload);
}
