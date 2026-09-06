// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useLiveSupportVisitor } from "@/features/chatbot/components/useLiveSupportVisitor";
import {
  encodeSupportBookingProposal,
  LIVE_SUPPORT_TOKEN_KEY,
} from "@/lib/support-booking-proposal";
import type {
  ChatMessage,
  SupportSessionResponse,
} from "@/features/chatbot/components/chat-widget.types";
import type { SupportBookingProposal } from "@/types/live-support";

const proposal: SupportBookingProposal = {
  roomTypeId: "room-new",
  roomName: "New Suite",
  pricePerNight: 2400,
  checkIn: "2026-10-10",
  checkOut: "2026-10-12",
  guests: 2,
  rooms: 1,
};

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Welcome",
};

function response(
  proposalBooking: SupportSessionResponse["proposalBooking"],
): SupportSessionResponse {
  return {
    conversation: {
      id: "conversation-1",
      status: "active",
      assigned_agent_id: "agent-1",
      booking_id: proposalBooking?.id ?? null,
      customer_id: "member-1",
    },
    messages: [
      {
        id: "proposal-message",
        sender: "system",
        content: encodeSupportBookingProposal(proposal),
        created_at: "2026-09-06T09:00:00.000Z",
      },
    ],
    proposalBooking,
    specialRequestOptions: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function useHarness() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const liveSupport = useLiveSupportVisitor({
    initialMessage,
    locale: "en",
    setMessages,
    setInput: vi.fn(),
    setIsLoading: vi.fn(),
    onReset: vi.fn(),
  });
  return { messages, ...liveSupport };
}

describe("useLiveSupportVisitor proposal restoration and polling", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    window.localStorage.setItem(LIVE_SUPPORT_TOKEN_KEY, "visitor-1");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("restores an actionable replacement proposal, then links only its booking on poll", async () => {
    const poll = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(response(null)))
      .mockReturnValueOnce(poll.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHarness());

    await waitFor(() =>
      expect(result.current.hasRequestedLiveSupport).toBe(true),
    );
    expect(result.current.supportBooking).toBeNull();
    expect(result.current.messages.at(-1)?.content).toBe(
      encodeSupportBookingProposal(proposal),
    );

    await act(async () => {
      poll.resolve(
        Response.json(
          response({
            id: "proposal-booking",
            bookingCode: "NB-CURRENT",
          } as NonNullable<SupportSessionResponse["proposalBooking"]>),
        ),
      );
      await poll.promise;
    });

    await waitFor(() =>
      expect(result.current.supportBooking?.id).toBe("proposal-booking"),
    );
    expect(result.current.messages.at(-1)?.id).toBe("proposal-message");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears an older linked booking when polling restores a replacement proposal", async () => {
    const replacement = {
      ...response(null),
      messages: [
        {
          id: "replacement-message",
          sender: "system" as const,
          content: encodeSupportBookingProposal({
            ...proposal,
            roomName: "Replacement Suite",
          }),
          created_at: "2026-09-06T09:05:00.000Z",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          response({
            id: "old-booking",
            bookingCode: "NB-OLD",
          } as NonNullable<SupportSessionResponse["proposalBooking"]>),
        ),
      )
      .mockResolvedValueOnce(Response.json(replacement));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHarness());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.supportBooking).toBeNull());
    expect(result.current.messages.at(-1)?.id).toBe("replacement-message");
  });
});
