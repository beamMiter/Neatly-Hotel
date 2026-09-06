import { describe, expect, it } from "vitest";
import {
  decodeSupportBookingProposal,
  encodeSupportBookingProposal,
} from "@/lib/support-booking-proposal";

const proposal = {
  roomTypeId: "11111111-1111-4111-8111-111111111111",
  roomName: "Superior",
  pricePerNight: 2100,
  checkIn: "2026-09-10",
  checkOut: "2026-09-12",
  guests: 2,
  rooms: 1,
};

describe("support booking proposal messages", () => {
  it("round-trips proposal details", () => {
    expect(decodeSupportBookingProposal(encodeSupportBookingProposal(proposal))).toEqual(proposal);
  });

  it("ignores ordinary and malformed support messages", () => {
    expect(decodeSupportBookingProposal("The customer sent a message")).toBeNull();
    expect(decodeSupportBookingProposal("__NEATLY_BOOKING_PROPOSAL__{}")).toBeNull();
  });
});
