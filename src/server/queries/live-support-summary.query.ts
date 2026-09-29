import "server-only";
import { GoogleGenAI } from "@google/genai";
import {
  listConversationMessages,
  updateSupportConversation,
} from "@/server/queries/live-support.query";

type ConversationMessages = Awaited<
  ReturnType<typeof listConversationMessages>
>;

const SUMMARY_SECTIONS = [
  "Customer context:",
  "Booking/details:",
  "Agent actions:",
  "Outcome / next step:",
] as const;

export class LiveSupportSummaryError extends Error {}

function isCompleteSummary(summary: string, messages: ConversationMessages) {
  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    summary.length < 120 ||
    summary.length > 700 ||
    lines.length !== SUMMARY_SECTIONS.length ||
    lines.some(
      (line, index) =>
        !line.startsWith(SUMMARY_SECTIONS[index]) || line.length > 240,
    )
  ) {
    return false;
  }

  const normalizedSummary = summary.replace(/\s+/g, " ").toLocaleLowerCase();
  return !messages.some((message) => {
    const normalizedMessage = message.content
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
    const copiedOpening = normalizedMessage.slice(0, 100);
    return (
      copiedOpening.length >= 60 && normalizedSummary.includes(copiedOpening)
    );
  });
}

export async function generateLiveSupportSummary(conversationId: string) {
  const messages = await listConversationMessages(conversationId);
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_SUMMARY_MODEL ?? "gemini-3.5-flash-lite";

  if (!apiKey) {
    throw new LiveSupportSummaryError("AI summary is not configured");
  }
  if (messages.length === 0) {
    throw new LiveSupportSummaryError("There are no messages to summarize");
  }

  try {
    const transcript = messages
      .map((message) => `${message.sender}: ${message.content}`)
      .join("\n");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Synthesize a concise handover summary of this hotel support conversation. Use only facts in the transcript; do not invent details or say a booking is confirmed unless the transcript says so.

Return exactly these four lines. Keep the English labels exactly as written, but write each summary sentence in the customer's language:
Customer context: what the customer wants and relevant details.
Booking/details: booking, stay, payment, or special-request facts; write "None recorded." only when absent.
Agent actions: what the agent explained, checked, created, changed, or promised.
Outcome / next step: the confirmed result and any remaining action; write "Not confirmed." when unclear.

Paraphrase and combine repeated information. Do not copy or quote whole messages. Omit greetings, pleasantries, and contact details unless a contact detail is required for a pending action. Keep each line under 180 characters and the whole summary under 600 characters. Preserve concrete dates, room types, guest counts, booking IDs, prices, payment status, and unresolved requests when present.\n\nTranscript:\n${transcript}`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0, maxOutputTokens: 260 },
    });
    let generatedSummary = response.text?.trim() ?? "";

    if (!isCompleteSummary(generatedSummary, messages)) {
      const retry = await ai.models.generateContent({
        model,
        contents: `${prompt}\n\nThe previous draft was too long, incomplete, or copied the transcript. Rewrite it more concisely and follow every constraint.\n\nPrevious draft:\n${generatedSummary}`,
        config: { temperature: 0, maxOutputTokens: 260 },
      });
      generatedSummary = retry.text?.trim() ?? "";
    }

    if (!isCompleteSummary(generatedSummary, messages)) {
      throw new LiveSupportSummaryError("AI returned an invalid summary");
    }

    return updateSupportConversation(conversationId, {
      summary: generatedSummary,
      summary_generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live support summary generation failed:", error);
    if (error instanceof LiveSupportSummaryError) throw error;
    throw new LiveSupportSummaryError("AI summary is temporarily unavailable");
  }
}
