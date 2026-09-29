import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportBooking, SupportConversation } from "@/types/live-support";

const mocks = vi.hoisted(() => ({
  addSupportMessage: vi.fn(),
  addSupportTranscriptMessages: vi.fn(),
  addVisitorSupportMessage: vi.fn(),
  createClient: vi.fn(),
  createOrReopenVisitorConversation: vi.fn(),
  findVisitorConversation: vi.fn(),
  getLinkedSupportBooking: vi.fn(),
  listConversationMessages: vi.fn(),
  listSupportBookings: vi.fn(),
  readJsonBody: vi.fn(),
}));

vi.mock("@/server/queries/live-support.query", () => ({
  addSupportMessage: mocks.addSupportMessage,
  addSupportTranscriptMessages: mocks.addSupportTranscriptMessages,
  addVisitorSupportMessage: mocks.addVisitorSupportMessage,
  createOrReopenVisitorConversation: mocks.createOrReopenVisitorConversation,
  ExpiredSupportConversationError: class extends Error {},
  findVisitorConversation: mocks.findVisitorConversation,
  getLinkedSupportBooking: mocks.getLinkedSupportBooking,
  isResolvedSupportConversationExpired: vi.fn(() => false),
  listConversationMessages: mocks.listConversationMessages,
  listSupportBookings: mocks.listSupportBookings,
  SupportMessageLimitError: class extends Error {},
}));

vi.mock("@/server/services/api-security", () => ({
  checkRateLimits: vi.fn(async () => ({ allowed: true })),
  hasOversizedBody: vi.fn(() => false),
  InvalidJsonError: class extends Error {},
  logApiFailure: vi.fn(),
  PayloadTooLargeError: class extends Error {},
  rateLimitExceededResponse: vi.fn(),
  RateLimitUnavailableError: class extends Error {},
  rateLimitUnavailableResponse: vi.fn(),
  readJsonBody: mocks.readJsonBody,
  requestId: vi.fn(() => "request-1"),
}));

vi.mock("@/server/db/supabase-server", () => ({ createClient: mocks.createClient }));
vi.mock("@/server/queries/chatbot-events.query", () => ({
  recordChatbotEvent: vi.fn(),
}));
vi.mock("@/server/queries/special-requests.query", () => ({
  getSpecialRequestCatalogForDisplay: vi.fn(async () => []),
}));

import { GET, POST } from "@/app/api/live-support/visitor/route";

const VISITOR_TOKEN = "11111111-1111-4111-8111-111111111111";

function conversation(bookingId: string | null): SupportConversation {
  return {
    id: "conversation-1",
    visitor_token: VISITOR_TOKEN,
    customer_name: "Nina Member",
    customer_phone: null,
    customer_id: "member-1",
    booking_id: bookingId,
    status: "active",
    topic: "Booking",
    assigned_agent_id: "agent-1",
    last_message_at: "2026-09-06T09:00:00.000Z",
    created_at: "2026-09-06T08:00:00.000Z",
    updated_at: "2026-09-06T09:00:00.000Z",
    resolved_at: null,
    summary: null,
    summary_generated_at: null,
  };
}

const historicalBooking = {
  id: "old-booking",
  bookingCode: "NB-OLD",
} as SupportBooking;

const proposalBooking = {
  id: "proposal-booking",
  bookingCode: "NB-CURRENT",
} as SupportBooking;

function visitorRequest() {
  return new Request(
    `http://localhost/api/live-support/visitor?visitorToken=${VISITOR_TOKEN}`,
  );
}

describe("GET /api/live-support/visitor proposal booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConversationMessages.mockResolvedValue([]);
    mocks.listSupportBookings.mockResolvedValue([historicalBooking]);
  });

  it("does not expose a returning member's booking history as proposal completion", async () => {
    mocks.findVisitorConversation.mockResolvedValue(conversation(null));
    mocks.getLinkedSupportBooking.mockResolvedValue(null);

    const response = await GET(visitorRequest());

    await expect(response.json()).resolves.toMatchObject({
      proposalBooking: null,
    });
    expect(mocks.listSupportBookings).not.toHaveBeenCalled();
  });

  it("returns no proposal booking for a guest or member with no linked booking", async () => {
    mocks.findVisitorConversation.mockResolvedValue({
      ...conversation(null),
      customer_id: null,
      customer_name: "Guest",
    });
    mocks.getLinkedSupportBooking.mockResolvedValue(null);

    const response = await GET(visitorRequest());

    await expect(response.json()).resolves.toMatchObject({
      proposalBooking: null,
    });
  });

  it("returns the booking linked to the current proposal", async () => {
    mocks.findVisitorConversation.mockResolvedValue(
      conversation(proposalBooking.id),
    );
    mocks.getLinkedSupportBooking.mockResolvedValue(proposalBooking);

    const response = await GET(visitorRequest());

    await expect(response.json()).resolves.toMatchObject({
      proposalBooking: { id: "proposal-booking", bookingCode: "NB-CURRENT" },
    });
  });
});

describe("POST /api/live-support/visitor chatbot history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });
    mocks.createOrReopenVisitorConversation.mockResolvedValue({ conversation: conversation(null), started: true });
    mocks.addSupportTranscriptMessages.mockResolvedValue([
      { id: "chatbot-welcome", sender: "system", sender_name: "Neatly Assistant", content: "Welcome", created_at: "2026-09-06T08:59:58.000Z" },
      { id: "chatbot-question", sender: "visitor", sender_name: null, content: "Can I change my booking?", created_at: "2026-09-06T08:59:59.000Z" },
    ]);
    mocks.addVisitorSupportMessage.mockResolvedValue({ id: "support-request", sender: "visitor", content: "I would like to speak with a live support agent.", created_at: "2026-09-06T09:00:00.000Z" });
    mocks.addSupportMessage.mockResolvedValue({ id: "waiting-message", sender: "system", content: "Your message has been sent to our team. Please wait a moment.", created_at: "2026-09-06T09:00:01.000Z" });
  });

  it("persists the complete chatbot transcript for the customer and admin", async () => {
    const history = [
      { role: "assistant" as const, content: "Welcome" },
      { role: "user" as const, content: "Can I change my booking?" },
    ];
    mocks.readJsonBody.mockResolvedValue({
      visitorToken: VISITOR_TOKEN,
      content: "I would like to speak with a live support agent.",
      locale: "en",
      contextMessage: "Can I change my booking?",
      history,
    });

    const response = await POST(new Request("http://localhost/api/live-support/visitor", { method: "POST" }));

    expect(response.status).toBe(201);
    expect(mocks.addSupportTranscriptMessages).toHaveBeenCalledWith("conversation-1", history);
    expect(mocks.addSupportMessage).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      historyMessages: [{ id: "chatbot-welcome" }, { id: "chatbot-question" }],
      contextMessage: null,
    });
  });
});
