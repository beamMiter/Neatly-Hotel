import "server-only";
import { GoogleGenAI } from "@google/genai";
import {
  listConversationMessages,
  updateSupportConversation,
} from "@/server/queries/live-support.query";

function fallbackSummary(messages: Awaited<ReturnType<typeof listConversationMessages>>) {
  const customerQuestion = messages.find((message) => message.sender === "visitor")?.content ?? "No customer request recorded.";
  const agentReply = messages.find((message) => message.sender === "agent")?.content ?? "No agent response recorded.";
  return `Customer asked: ${customerQuestion}\nAgent assistance: ${agentReply}\nOutcome: Conversation resolved.`;
}

export async function generateLiveSupportSummary(conversationId: string) {
  const messages = await listConversationMessages(conversationId);
  const fallback = fallbackSummary(messages);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || messages.length === 0) {
    return updateSupportConversation(conversationId, {
      summary: fallback,
      summary_generated_at: new Date().toISOString(),
    });
  }

  try {
    const transcript = messages
      .map((message) => `${message.sender}: ${message.content}`)
      .join("\n");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
      contents: `Summarize this hotel support conversation using only facts in the transcript. Return exactly three concise lines in English:\nCustomer asked: ...\nAgent assistance: ...\nOutcome: ...\nIf the outcome is not explicit, say \"Outcome: Not confirmed.\"\n\nTranscript:\n${transcript}`,
      config: { temperature: 0, maxOutputTokens: 180 },
    });
    const summary = response.text?.trim() || fallback;
    return updateSupportConversation(conversationId, {
      summary,
      summary_generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live support summary generation failed:", error);
    return updateSupportConversation(conversationId, {
      summary: fallback,
      summary_generated_at: new Date().toISOString(),
    });
  }
}
