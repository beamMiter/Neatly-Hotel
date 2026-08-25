import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";
import type { ChatbotFaq, ChatbotSettings, ChatbotSuggestion } from "@/types/chatbot";

export async function getPublishedChatbotContent(): Promise<{ faqs: ChatbotFaq[]; autoReply: string | null }> {
  const supabase = await createClient();
  const [faqResult, settingsResult] = await Promise.all([
    supabase.from("chatbot_faqs").select("*").eq("is_active", true).order("sort_order").limit(100),
    supabase.from("chatbot_settings").select("auto_reply_message").eq("id", true).maybeSingle(),
  ]);
  return { faqs: faqResult.error ? [] : faqResult.data as ChatbotFaq[], autoReply: settingsResult.data?.auto_reply_message ?? null };
}

export async function updateChatbotSettings(input: Pick<ChatbotSettings, "greeting_message" | "auto_reply_message">) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", true)
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
