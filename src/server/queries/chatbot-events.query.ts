import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { ChatbotEventInput } from "@/types/chatbot";

export async function recordChatbotEvent(event: ChatbotEventInput) {
  const { error } = await supabaseAdmin.from("chatbot_interaction_events").insert({
    request_id: event.requestId,
    event_type: event.eventType,
    intent: event.intent,
    response_mode: event.responseMode,
    fallback_reason: event.fallbackReason,
    handoff_reason: event.handoffReason,
  });
  if (error) throw error;
}
