import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { ChatbotSettings, ChatbotSuggestion } from "@/types/chatbot";

export async function getPublishedChatbotContent(): Promise<{
  autoReplyTh: string | null;
  autoReplyEn: string | null;
}> {
  // This message is rendered by the public chat widget. Use the server-only
  // client so RLS cannot make admin setup and guest widget see different values.
  const settingsResult = await supabaseAdmin
    .from("chatbot_settings")
    .select("auto_reply_message, auto_reply_message_th, auto_reply_message_en")
    .eq("id", true)
    .maybeSingle();

  if (settingsResult.error) console.error("Failed to load chatbot auto-reply message:", settingsResult.error);

  return {
    autoReplyTh: settingsResult.error ? null : settingsResult.data?.auto_reply_message_th ?? settingsResult.data?.auto_reply_message ?? null,
    autoReplyEn: settingsResult.error ? null : settingsResult.data?.auto_reply_message_en ?? null,
  };
}

export async function updateChatbotSettings(input: Pick<ChatbotSettings, "greeting_message" | "auto_reply_message" | "greeting_message_th" | "greeting_message_en" | "auto_reply_message_th" | "auto_reply_message_en">) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_settings")
    .upsert(
      { id: true, ...input, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatbotSettings;
}

export async function createChatbotSuggestion(input: Omit<ChatbotSuggestion, "created_at" | "updated_at">) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_suggestions")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatbotSuggestion;
}

export async function updateChatbotSuggestion(id: string, input: Partial<Omit<ChatbotSuggestion, "id" | "created_at" | "updated_at">>) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_suggestions")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatbotSuggestion;
}

export async function deleteChatbotSuggestion(id: string) {
  const { error } = await supabaseAdmin.from("chatbot_suggestions").delete().eq("id", id);
  if (error) throw error;
}
