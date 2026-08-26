import "server-only";
import { parseCreateBookingPayload } from "@/features/booking/validations";
import { validateStayDates } from "@/features/booking/date-rules";
import { createPendingBooking, markBookingCashConfirmed } from "@/server/queries/bookings.query";
import { assertEmailVerificationToken } from "@/server/queries/email-otp.query";
import {
  addSupportMessage,
  findSupportMemberMatches,
  getSupportConversation,
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
    paymentMethod: "cash",
  });

  await markBookingCashConfirmed(booking.id);
  await updateSupportConversation(conversation.id, { booking_id: booking.id, customer_id: customerId });
  await addSupportMessage(
    conversation.id,
    "system",
    `Booking ${booking.bookingCode} created as ${customerId ? "member" : "guest"} booking. Payment: pay at hotel.`,
  );

  return { booking, customerType: customerId ? "member" as const : "guest" as const, customerId };
}
