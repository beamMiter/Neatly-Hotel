import { describe, expect, it } from "vitest";
import {
  mergeChatMessages,
  mergeSupportMessages,
  toChatMessage,
} from "@/features/chatbot/components/live-support-message-order";

describe("live support message ordering", () => {
  it("places a late-arriving booking event before a newer visitor message", () => {
    const result = mergeSupportMessages(
      [
        {
          id: "seminar-request",
          role: "user",
          content: "I am interested in Seminar Room Booking",
          createdAt: "2026-08-31T10:05:00.000Z",
        },
      ],
      [
        {
          id: "booking-ready",
          sender: "system",
          content: "Booking NB-20260831-H47B is ready for confirmation.",
          created_at: "2026-08-31T10:00:00.000Z",
        },
      ],
    );

    expect(result.map((message) => message.id)).toEqual([
      "booking-ready",
      "seminar-request",
    ]);
  });

  it("deduplicates a saved message after the optimistic message is replaced", () => {
    const confirmed = toChatMessage({
      id: "saved-message",
      sender: "visitor",
      content: "Hello",
      created_at: "2026-08-31T10:01:00.000Z",
    });
    const result = mergeChatMessages(
      [
        {
          id: "booking-ready",
          role: "assistant",
          content: "Booking ready",
          createdAt: "2026-08-31T10:00:00.000Z",
        },
        confirmed,
      ],
      [confirmed],
    );

    expect(result.map((message) => message.id)).toEqual([
      "booking-ready",
      "saved-message",
    ]);
  });
});
