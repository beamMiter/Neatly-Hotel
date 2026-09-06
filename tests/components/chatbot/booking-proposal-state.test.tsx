// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { encodeSupportBookingProposal } from "@/lib/support-booking-proposal";
import type { ChatMessage } from "@/features/chatbot/components/chat-widget.types";
import type {
  SupportBooking,
  SupportBookingProposal,
} from "@/types/live-support";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/features/chatbot/components/support-booking-proposal-card", () => ({
  SupportBookingProposalCard: ({
    proposal,
  }: {
    proposal: SupportBookingProposal;
  }) => <button type="button">Confirm {proposal.roomName}</button>,
}));
vi.mock("@/features/chatbot/components/support-booking-card", () => ({
  SupportBookingCard: () => <div>Linked booking</div>,
  isBookingConfirmationMessage: () => false,
}));

import { ChatMessageList } from "@/features/chatbot/components/ChatMessageList";

const oldProposal: SupportBookingProposal = {
  roomTypeId: "room-old",
  roomName: "Old Deluxe",
  pricePerNight: 1800,
  checkIn: "2026-10-10",
  checkOut: "2026-10-12",
  guests: 2,
  rooms: 1,
};

const newProposal: SupportBookingProposal = {
  ...oldProposal,
  roomTypeId: "room-new",
  roomName: "New Suite",
  pricePerNight: 2400,
};

const linkedBooking = {
  id: "proposal-booking",
  bookingCode: "NB-CURRENT",
} as SupportBooking;

function proposalMessage(
  id: string,
  proposal: SupportBookingProposal,
): ChatMessage {
  return {
    id,
    role: "assistant",
    content: encodeSupportBookingProposal(proposal),
  };
}

function renderMessages(
  messages: ChatMessage[],
  supportBooking: SupportBooking | null,
  isLoggedIn = true,
) {
  render(
    <ChatMessageList
      messages={messages}
      supportBooking={supportBooking}
      specialRequestOptions={[]}
      visitorToken="visitor-1"
      isLoggedIn={isLoggedIn}
      onGuestBookingDialogChange={vi.fn()}
      onNavigateToMainFlow={vi.fn()}
      locale="en"
      isSupportResolved={false}
      isBooking={false}
      bookNowLabel="Book now"
      viewDetailsLabel="View details"
      onStartBooking={vi.fn()}
      onOpenMainBooking={vi.fn()}
      onSelectSuggestedRoom={vi.fn()}
      onCreateLiveSupport={vi.fn()}
      onPayment={vi.fn()}
    />,
  );
}

describe("ChatMessageList proposal state", () => {
  afterEach(cleanup);

  it.each([
    ["returning member", true],
    ["guest or member without bookings", false],
  ])("keeps a new proposal actionable for a %s", (_label, isLoggedIn) => {
    renderMessages([proposalMessage("new", newProposal)], null, isLoggedIn);

    expect(
      screen.getByRole("button", { name: "Confirm New Suite" }),
    ).toBeTruthy();
    expect(screen.queryByText("Booking proposal completed.")).toBeNull();
  });

  it("marks the current linked proposal completed", () => {
    renderMessages([proposalMessage("new", newProposal)], linkedBooking);

    expect(screen.getByText("Booking proposal completed.")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Confirm New Suite" }),
    ).toBeNull();
  });

  it("does not let an older proposal booking hide a replacement proposal", () => {
    renderMessages(
      [
        proposalMessage("old", oldProposal),
        proposalMessage("new", newProposal),
      ],
      null,
    );

    expect(screen.getByText("Booking proposal replaced.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirm New Suite" }),
    ).toBeTruthy();
  });

  it("only labels the latest proposal completed after its booking is linked", () => {
    renderMessages(
      [
        proposalMessage("old", oldProposal),
        proposalMessage("new", newProposal),
      ],
      linkedBooking,
    );

    expect(screen.getByText("Booking proposal replaced.")).toBeTruthy();
    expect(screen.getAllByText("Booking proposal completed.")).toHaveLength(1);
  });
});
