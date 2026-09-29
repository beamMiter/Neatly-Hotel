import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSupportBookingProposal } from "@/lib/support-booking-proposal";
import type {
  SupportBookingProposal,
  SupportConversation,
} from "@/types/live-support";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  addSupportMessage: vi.fn(),
  findVisitorConversation: vi.fn(),
  getSupportConversation: vi.fn(),
  listConversationMessages: vi.fn(),
  searchRoomTypes: vi.fn(),
  updateSupportConversation: vi.fn(),
}));

vi.mock("@/features/booking/date-rules", () => ({
  validateStayDates: vi.fn(() => null),
}));
vi.mock("@/server/queries/bookings.query", () => ({
  cancelBooking: vi.fn(),
  updatePendingBookingSpecialRequests: vi.fn(),
}));
vi.mock("@/server/queries/email-otp.query", () => ({
  assertEmailVerificationToken: vi.fn(),
}));
vi.mock("@/server/queries/booking-search.query", () => ({
  searchRoomTypes: mocks.searchRoomTypes,
}));
vi.mock("@/server/queries/live-support.query", () => ({
  addSupportMessage: mocks.addSupportMessage,
  findVisitorConversation: mocks.findVisitorConversation,
  getSupportConversation: mocks.getSupportConversation,
  listConversationMessages: mocks.listConversationMessages,
  listSupportBookings: vi.fn(),
  updateSupportConversation: mocks.updateSupportConversation,
}));

import {
  createBookingProposalForSupportConversation,
  linkBookingToSupportConversation,
} from "@/server/services/live-support-booking.service";

const baseProposal: SupportBookingProposal = {
  roomTypeId: "room-old",
  roomName: "Old Deluxe",
  pricePerNight: 1800,
  checkIn: "2026-10-10",
  checkOut: "2026-10-12",
  guests: 2,
  rooms: 1,
};

const replacementProposal: SupportBookingProposal = {
  ...baseProposal,
  roomTypeId: "room-new",
  roomName: "New Suite",
  pricePerNight: 2400,
};

const conversation = {
  id: "conversation-1",
  visitor_token: "visitor-1",
  customer_name: "Nina Member",
  customer_phone: null,
  customer_id: "member-1",
  booking_id: "old-booking",
  status: "active",
  topic: "Booking",
  assigned_agent_id: "agent-1",
  last_message_at: "2026-09-06T09:00:00.000Z",
  created_at: "2026-09-06T08:00:00.000Z",
  updated_at: "2026-09-06T09:00:00.000Z",
  resolved_at: null,
  summary: null,
  summary_generated_at: null,
} satisfies SupportConversation;

describe("live-support booking proposal service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupportConversation.mockResolvedValue(conversation);
    mocks.findVisitorConversation.mockResolvedValue(conversation);
    mocks.addSupportMessage.mockResolvedValue({ id: "message-new" });
  });

  it("clears an older booking link when sending a replacement proposal", async () => {
    mocks.searchRoomTypes.mockResolvedValue([
      {
        id: replacementProposal.roomTypeId,
        name: replacementProposal.roomName,
        discountedPrice: replacementProposal.pricePerNight,
      },
    ]);

    await createBookingProposalForSupportConversation({
      conversationId: conversation.id,
      proposal: replacementProposal,
    });

    expect(mocks.updateSupportConversation).toHaveBeenCalledWith(
      conversation.id,
      { booking_id: null },
    );
    expect(mocks.addSupportMessage).toHaveBeenCalledWith(
      conversation.id,
      "system",
      encodeSupportBookingProposal(replacementProposal),
    );
  });

  it("links a booking only when it matches the latest proposal", async () => {
    mocks.listConversationMessages.mockResolvedValue([
      { sender: "system", content: encodeSupportBookingProposal(baseProposal) },
      {
        sender: "system",
        content: encodeSupportBookingProposal(replacementProposal),
      },
    ]);
    const input = {
      visitorToken: conversation.visitor_token,
      bookingId: "proposal-booking",
      bookingCode: "NB-CURRENT",
      customerId: conversation.customer_id,
      customerName: conversation.customer_name,
      checkIn: replacementProposal.checkIn,
      checkOut: replacementProposal.checkOut,
      guests: replacementProposal.guests,
      rooms: replacementProposal.rooms,
    };

    await expect(
      linkBookingToSupportConversation({
        ...input,
        roomTypeId: baseProposal.roomTypeId,
      }),
    ).resolves.toBe(false);
    expect(mocks.updateSupportConversation).not.toHaveBeenCalled();

    await expect(
      linkBookingToSupportConversation({
        ...input,
        roomTypeId: replacementProposal.roomTypeId,
      }),
    ).resolves.toBe(true);
    expect(mocks.updateSupportConversation).toHaveBeenCalledWith(
      conversation.id,
      expect.objectContaining({ booking_id: "proposal-booking" }),
    );
  });
});
