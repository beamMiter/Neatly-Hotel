import "server-only";
import { validateStayDates } from "@/features/booking/date-rules";
import { cancelBooking, updatePendingBookingSpecialRequests } from "@/server/queries/bookings.query";
import { assertEmailVerificationToken } from "@/server/queries/email-otp.query";
import { searchRoomTypes } from "@/server/queries/booking-search.query";
import { decodeSupportBookingProposal, encodeSupportBookingProposal } from "@/lib/support-booking-proposal";
import type { SupportBookingProposal } from "@/types/live-support";
import {
  addSupportMessage,
  findVisitorConversation,
  getSupportConversation,
  listConversationMessages,
  listSupportBookings,
  updateSupportConversation,
} from "@/server/queries/live-support.query";

export class AdminBookingValidationError extends Error {}

export async function createBookingProposalForSupportConversation(input: {
  conversationId: string;
  proposal: Pick<SupportBookingProposal, "roomTypeId" | "checkIn" | "checkOut" | "guests" | "rooms">;
}) {
  const conversation = await getSupportConversation(input.conversationId);
  if (!conversation) throw new AdminBookingValidationError("Support conversation was not found");

  const dateError = validateStayDates(input.proposal.checkIn, input.proposal.checkOut);
  if (dateError) throw new AdminBookingValidationError(dateError);

  const availableRooms = await searchRoomTypes({
    checkIn: input.proposal.checkIn,
    checkOut: input.proposal.checkOut,
    guests: input.proposal.guests,
    rooms: input.proposal.rooms,
  });
  const room = availableRooms.find((item) => item.id === input.proposal.roomTypeId);
  if (!room) throw new AdminBookingValidationError("The selected room is no longer available");

  const proposal: SupportBookingProposal = {
    roomTypeId: room.id,
    roomName: room.name,
    pricePerNight: room.discountedPrice,
    checkIn: input.proposal.checkIn,
    checkOut: input.proposal.checkOut,
    guests: input.proposal.guests,
    rooms: input.proposal.rooms,
  };
  await updateSupportConversation(conversation.id, { booking_id: null });
  const supportMessage = await addSupportMessage(
    conversation.id,
    "system",
    encodeSupportBookingProposal(proposal),
  );

  return { proposal, supportMessage };
}

export async function linkBookingToSupportConversation(input: {
  visitorToken: string;
  bookingId: string;
  bookingCode: string;
  customerId: string | null;
  customerName: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}) {
  const conversation = await findVisitorConversation(input.visitorToken);
  if (!conversation) return false;

  const messages = await listConversationMessages(conversation.id);
  const proposal = messages.findLast((message) => message.sender === "system" && decodeSupportBookingProposal(message.content));
  const details = proposal ? decodeSupportBookingProposal(proposal.content) : null;
  if (
    !details
    || details.roomTypeId !== input.roomTypeId
    || details.checkIn !== input.checkIn
    || details.checkOut !== input.checkOut
    || details.guests !== input.guests
    || details.rooms !== input.rooms
  ) return false;

  await updateSupportConversation(conversation.id, {
    booking_id: input.bookingId,
    customer_id: input.customerId,
    customer_name: input.customerName || conversation.customer_name,
  });
  await addSupportMessage(
    conversation.id,
    "system",
    `Booking ${input.bookingCode} was created from the live support proposal.`,
  );
  return true;
}

export async function confirmVisitorBookingSpecialRequests(input: {
  visitorToken: string;
  bookingId: string;
  emailVerificationToken?: string;
  specialRequests: { code: string; count?: number }[];
}) {
  const conversation = await findVisitorConversation(input.visitorToken);
  if (!conversation || conversation.booking_id !== input.bookingId) {
    throw new AdminBookingValidationError("Booking does not belong to this support conversation");
  }
  const [messages, bookings] = await Promise.all([
    listConversationMessages(conversation.id),
    listSupportBookings(conversation),
  ]);
  const booking = bookings.find((item) => item.id === input.bookingId);
  if (!booking) {
    throw new AdminBookingValidationError("Booking does not belong to this support conversation");
  }
  if (
    booking.requiresEmailVerification
    && (!input.emailVerificationToken || !assertEmailVerificationToken(booking.guestEmail, input.emailVerificationToken))
  ) {
    throw new AdminBookingValidationError("Please verify your email before confirming this booking");
  }
  const allowsSpecialRequests = Boolean(booking && messages.some((message) =>
    message.sender === "system" &&
    message.content.startsWith(`Booking ${booking.bookingCode} is ready for confirmation with special requests.`),
  ));
  if (!allowsSpecialRequests && input.specialRequests.length === 0) {
    return { booking };
  }
  if (!allowsSpecialRequests) {
    throw new AdminBookingValidationError("Special requests are not enabled for this booking");
  }
  return updatePendingBookingSpecialRequests(input.bookingId, input.specialRequests);
}

export async function cancelSupportBookingForAdmin(conversationId: string, bookingId: string) {
  const conversation = await getSupportConversation(conversationId);
  if (!conversation || conversation.booking_id !== bookingId) {
    throw new AdminBookingValidationError("Booking does not belong to this support conversation");
  }

  const result = await cancelBooking(bookingId, conversation.customer_id);
  const supportMessage = await addSupportMessage(
    conversation.id,
    "system",
    `Booking ${result.booking.bookingCode} has been cancelled by the hotel.`,
  );
  return { ...result, supportMessage };
}
