import "server-only";
import { parseCreateBookingPayload } from "@/features/booking/validations";
import { validateStayDates } from "@/features/booking/date-rules";
import { cancelBooking, createPendingBooking, updatePendingBookingSpecialRequests } from "@/server/queries/bookings.query";
import { assertEmailVerificationToken } from "@/server/queries/email-otp.query";
import {
  addSupportMessage,
  findVisitorConversation,
  findSupportMemberMatches,
  getSupportConversation,
  listConversationMessages,
  listSupportBookings,
  updateSupportConversation,
} from "@/server/queries/live-support.query";
import type { SupportMemberMatch } from "@/types/live-support";

export class AdminBookingValidationError extends Error {}

export class SupportMemberSelectionError extends Error {
  constructor(public readonly matches: SupportMemberMatch[]) {
    super("Multiple members match these details. Select the correct member.");
  }
}

export async function getSupportBookingIdentity(conversationId: string, phone: string | null, email: string | null) {
  const conversation = await getSupportConversation(conversationId);
  if (!conversation) throw new AdminBookingValidationError("Support conversation was not found");
  const matches = await findSupportMemberMatches({ customerId: conversation.customer_id, phone, email });
  return {
    kind: matches.length === 0 ? "guest" as const : matches.length === 1 ? "member" as const : "ambiguous" as const,
    matches,
    selectedCustomerId: matches.length === 1 ? matches[0].customerId : null,
  };
}

export async function createBookingForSupportConversation(input: {
  conversationId: string;
  selectedCustomerId?: string | null;
  emailVerificationToken?: string;
  booking: unknown;
  allowSpecialRequests?: boolean;
}) {
  const conversation = await getSupportConversation(input.conversationId);
  if (!conversation) throw new AdminBookingValidationError("Support conversation was not found");

  const parsed = parseCreateBookingPayload(input.booking);
  if (!parsed.success) throw new AdminBookingValidationError("Please complete all required booking details");
  const { data } = parsed;
  const dateError = validateStayDates(data.checkIn, data.checkOut);
  if (dateError) throw new AdminBookingValidationError(dateError);

  const matches = await findSupportMemberMatches({
    customerId: conversation.customer_id,
    phone: data.phone,
    email: data.email,
  });
  let customerId = conversation.customer_id;
  if (!customerId && input.selectedCustomerId) {
    if (!matches.some((match) => match.customerId === input.selectedCustomerId)) {
      throw new AdminBookingValidationError("The selected member does not match the booking details");
    }
    customerId = input.selectedCustomerId;
  } else if (!customerId && matches.length === 1) {
    customerId = matches[0].customerId;
  } else if (!customerId && matches.length > 1) {
    throw new SupportMemberSelectionError(matches);
  }

  if (!customerId && (!input.emailVerificationToken || !assertEmailVerificationToken(data.email, input.emailVerificationToken))) {
    throw new AdminBookingValidationError("Please verify the guest email before creating a booking");
  }

  const { booking } = await createPendingBooking({
    customerId,
    roomTypeId: data.roomTypeId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: data.guests,
    rooms: data.rooms,
    guestInfo: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth.toISOString().slice(0, 10),
      country: data.country,
    },
    standardRequests: data.standardRequests,
    specialRequests: data.specialRequests,
    additionalRequest: data.additionalRequest ?? null,
    promoCode: data.promoCode ?? null,
    // The customer chooses the final payment method on the main website.
    // This creates a standard 30-minute pending-payment hold in the meantime.
    paymentMethod: "credit_card",
  });

  await updateSupportConversation(conversation.id, { booking_id: booking.id, customer_id: customerId });
  const supportMessage = await addSupportMessage(
    conversation.id,
    "system",
    input.allowSpecialRequests
      ? `Booking ${booking.bookingCode} is ready for confirmation with special requests. Choose any extras you need, then confirm the booking.`
      : `Booking ${booking.bookingCode} is ready for confirmation. Review the booking and choose a payment method on the Neatly Hotel website.`,
  );

  return { booking, customerType: customerId ? "member" as const : "guest" as const, customerId, supportMessage };
}

export async function confirmVisitorBookingSpecialRequests(input: {
  visitorToken: string;
  bookingId: string;
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
  const allowsSpecialRequests = Boolean(booking && messages.some((message) =>
    message.sender === "system" &&
    message.content.startsWith(`Booking ${booking.bookingCode} is ready for confirmation with special requests.`),
  ));
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
