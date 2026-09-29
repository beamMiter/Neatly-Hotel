import type { ChatbotSettings, ChatbotSuggestion } from "@/types/chatbot";

async function call<T>(method: "POST" | "PATCH" | "DELETE", body: unknown): Promise<T> {
  const response = await fetch("/api/admin/chatbot", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(data.error ?? "Unable to save chatbot configuration");
  return data;
}

export function saveChatbotSettings(data: Pick<ChatbotSettings, "greeting_message" | "auto_reply_message" | "greeting_message_th" | "greeting_message_en" | "auto_reply_message_th" | "auto_reply_message_en">) {
  return call<{ settings: ChatbotSettings }>("PATCH", { resource: "settings", data });
}

export function createChatbotSuggestion(data: Omit<ChatbotSuggestion, "created_at" | "updated_at">) {
  return call<{ suggestion: ChatbotSuggestion }>("POST", { resource: "suggestion", data });
}

export function updateChatbotSuggestion(id: string, data: Partial<Omit<ChatbotSuggestion, "id" | "created_at" | "updated_at">>) {
  return call<{ suggestion: ChatbotSuggestion }>("PATCH", { resource: "suggestion", id, data });
}

export function deleteChatbotSuggestion(id: string) {
  return call<void>("DELETE", { resource: "suggestion", id });
}
