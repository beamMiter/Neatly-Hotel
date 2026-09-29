import type { SupportBookingProposal } from "@/types/live-support";

const PROPOSAL_PREFIX = "__NEATLY_BOOKING_PROPOSAL__";

export const LIVE_SUPPORT_TOKEN_KEY = "neatly-live-support-token";

export function encodeSupportBookingProposal(proposal: SupportBookingProposal) {
  return PROPOSAL_PREFIX + JSON.stringify(proposal);
}

export function decodeSupportBookingProposal(content: string): SupportBookingProposal | null {
  if (!content.startsWith(PROPOSAL_PREFIX)) return null;

  try {
    const value = JSON.parse(content.slice(PROPOSAL_PREFIX.length)) as Partial<SupportBookingProposal>;
    if (
      typeof value.roomTypeId !== "string"
      || typeof value.roomName !== "string"
      || typeof value.pricePerNight !== "number"
      || typeof value.checkIn !== "string"
      || typeof value.checkOut !== "string"
      || typeof value.guests !== "number"
      || typeof value.rooms !== "number"
    ) return null;
    return value as SupportBookingProposal;
  } catch {
    return null;
  }
}
