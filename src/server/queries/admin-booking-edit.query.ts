import "server-only";
import { nightsBetween } from "@/features/booking/date-rules";
import {
  calculateEditPriceDifference,
  getAdminBookingEditBlockMessage,
  resolveEditPaymentRequirement,
} from "@/lib/admin-booking-edit";
import { prisma } from "@/server/db";
import { validatePromotionCode } from "@/server/queries/promo.query";
import {
  getSpecialRequestCatalog,
  resolveSelectedSpecialRequests,
  validateStandardRequestCodes,
} from "@/server/queries/special-requests.query";
import {
  AmountTooLowError,
  InvalidPromoError,
} from "@/server/queries/bookings.query";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";
import type {
  AdminBookingEditPricingDelta,
  AdminEditPaymentRequirement,
  AdminEditSpecialRequestsInput,
} from "@/types/admin-booking-edit";
import type { BookingStatus, SpecialRequestSelection } from "@/types/booking";

const MIN_CHARGE_THB = 10;

export class PaymentMethodRequiredError extends Error {
  constructor() {
    super("Payment method is required when the booking total increases");
  }
}

function asBookingStatus(value: string): BookingStatus {
  if (
    value === "pending_payment" ||
    value === "confirmed" ||
    value === "checked_in" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "refunded"
  ) {
    return value;
  }
  return "confirmed";
}

async function getRoomTypeIdForBooking(bookingId: string): Promise<string | null> {
  const row = await prisma.$queryRaw<{ room_type_id: string }[]>`
    select r.room_type_id
    from booking_rooms br
    join rooms r on r.id = br.room_id
    where br.booking_id = ${bookingId}::uuid
    limit 1
  `;
  return row[0]?.room_type_id ?? null;
}

export async function updateBookingSpecialRequests(
  bookingId: string,
  input: AdminEditSpecialRequestsInput,
): Promise<{
  pricingDelta: AdminBookingEditPricingDelta;
  paymentRequirement: AdminEditPaymentRequirement;
}> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
      totalAmount: true,
      promoCode: true,
      paymentStatus: true,
      rooms: { select: { pricePerNight: true } },
    },
  });

  if (!booking) throw new BookingNotFoundError();

  const status = asBookingStatus(booking.status);
  const blockMessage = getAdminBookingEditBlockMessage(status);
  if (blockMessage) {
    throw new InvalidBookingTransitionError(blockMessage);
  }

  const checkIn = booking.checkIn.toISOString().slice(0, 10);
  const checkOut = booking.checkOut.toISOString().slice(0, 10);
  const nights = nightsBetween(checkIn, checkOut);
  const roomSubtotal = booking.rooms.reduce((sum, room) => sum + Number(room.pricePerNight), 0) * nights;

  const catalog = await getSpecialRequestCatalog();
  if (!validateStandardRequestCodes(catalog, input.standardRequests)) {
    throw new InvalidBookingTransitionError("One or more selected standard requests are invalid");
  }

  const selections: SpecialRequestSelection[] = input.specialRequests.map((item) => ({
    code: item.code,
    count: item.count,
  }));
  const selectedSpecialRequests = resolveSelectedSpecialRequests(catalog, selections, nights);
  const addonsTotal = selectedSpecialRequests.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  const trimmedPromo = booking.promoCode?.trim();
  if (trimmedPromo) {
    const roomTypeId = await getRoomTypeIdForBooking(bookingId);
    if (!roomTypeId) {
      throw new InvalidBookingTransitionError("Cannot re-apply promotion — booking has no assigned room type");
    }

    const promoResult = await validatePromotionCode({
      code: trimmedPromo,
      roomTypeId,
      subtotal: roomSubtotal + addonsTotal,
    });
    if (!promoResult.valid) {
      throw new InvalidPromoError(promoResult.message);
    }
    discountAmount = promoResult.discountAmount;
  }

  const previousTotal = Number(booking.totalAmount);
  const nextTotal = roomSubtotal + addonsTotal - discountAmount;
  const difference = calculateEditPriceDifference(previousTotal, nextTotal);

  if (difference > 0 && !input.paymentMethod) {
    throw new PaymentMethodRequiredError();
  }

  if (difference > 0 && input.paymentMethod === "credit_card" && difference < MIN_CHARGE_THB) {
    throw new AmountTooLowError();
  }

  const paymentRequirement = input.paymentMethod
    ? resolveEditPaymentRequirement(input.paymentMethod, difference)
    : { requiresPayment: false as const };

  const nextPaymentStatus =
    paymentRequirement.requiresPayment ? paymentRequirement.paymentStatus : booking.paymentStatus;

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      standardRequests: input.standardRequests,
      specialRequests: selectedSpecialRequests,
      addonsTotal,
      additionalRequest: input.additionalRequest,
      discountAmount,
      totalAmount: nextTotal,
      paymentStatus: nextPaymentStatus,
    },
  });

  return {
    pricingDelta: { previousTotal, nextTotal, difference },
    paymentRequirement,
  };
}
