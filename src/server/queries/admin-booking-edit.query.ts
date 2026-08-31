import "server-only";
import { Prisma } from "@prisma/client";
import { nightsBetween } from "@/features/booking/date-rules";
import { selectionCountFromStoredQuantity } from "@/lib/addon-pricing";
import {
  calculateEditPriceDifference,
  getAdminBookingEditBlockMessage,
  resolveEditPaymentRequirement,
  validateAdminDateChange,
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
  AdminBookingEditPaymentMethod,
  AdminBookingEditPricingDelta,
  AdminEditDatesInput,
  AdminEditPaymentRequirement,
  AdminEditSpecialRequestsInput,
} from "@/types/admin-booking-edit";
import type { BookingStatus, SelectedSpecialRequest, SpecialRequestSelection } from "@/types/booking";

const MIN_CHARGE_THB = 10;
const NON_BLOCKING_BOOKING_STATUSES = ["cancelled", "canceled", "completed", "refunded"];

export class PaymentMethodRequiredError extends Error {
  constructor() {
    super("Payment method is required when the booking total increases");
  }
}

export class AdminBookingRoomConflictError extends Error {
  constructor() {
    super("The assigned room is not available for the selected dates — choose a different room");
  }
}

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
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

function parseStoredSpecialRequests(value: unknown): SelectedSpecialRequest[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is SelectedSpecialRequest => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as SelectedSpecialRequest).code === "string" &&
        typeof (item as SelectedSpecialRequest).label === "string"
      );
    })
    .map((item) => ({ ...item, quantity: item.quantity ?? 1 }));
}

async function hasAssignedRoomConflict(
  bookingId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const conflicts = await prisma.$queryRaw<{ count: bigint }[]>`
    select count(*) as count
    from booking_rooms br
    join bookings b on b.id = br.booking_id
    where br.room_id in (select room_id from booking_rooms where booking_id = ${bookingId}::uuid)
      and b.id <> ${bookingId}::uuid
      and b.status not in (${Prisma.join(NON_BLOCKING_BOOKING_STATUSES)})
      and (b.expires_at is null or b.expires_at > now())
      and b.check_in < ${checkOut}::date
      and b.check_out > ${checkIn}::date
  `;
  return Number(conflicts[0]?.count ?? 0) > 0;
}

async function selectionsFromStoredSpecialRequests(
  stored: SelectedSpecialRequest[],
  nights: number,
): Promise<SpecialRequestSelection[]> {
  const catalog = await getSpecialRequestCatalog();
  const selections: SpecialRequestSelection[] = [];

  for (const item of stored) {
    const option = catalog.find((entry) => entry.code === item.code);
    if (!option) continue;
    selections.push({
      code: item.code,
      count: selectionCountFromStoredQuantity(option.billingType, item.quantity ?? 1, nights),
    });
  }

  return selections;
}

async function computeEditedBookingPricing(params: {
  bookingId: string;
  nights: number;
  pricePerNightSum: number;
  specialRequestSelections: SpecialRequestSelection[];
  promoCode: string | null;
}): Promise<{
  selectedSpecialRequests: SelectedSpecialRequest[];
  addonsTotal: number;
  discountAmount: number;
  roomSubtotal: number;
  totalAmount: number;
}> {
  const roomSubtotal = params.pricePerNightSum * params.nights;
  const catalog = await getSpecialRequestCatalog();
  const selectedSpecialRequests = resolveSelectedSpecialRequests(
    catalog,
    params.specialRequestSelections,
    params.nights,
  );
  const addonsTotal = selectedSpecialRequests.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  const trimmedPromo = params.promoCode?.trim();
  if (trimmedPromo) {
    const roomTypeId = await getRoomTypeIdForBooking(params.bookingId);
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

  return {
    selectedSpecialRequests,
    addonsTotal,
    discountAmount,
    roomSubtotal,
    totalAmount: roomSubtotal + addonsTotal - discountAmount,
  };
}

function resolvePaymentDelta(params: {
  previousTotal: number;
  nextTotal: number;
  paymentMethod: AdminBookingEditPaymentMethod | undefined;
  currentPaymentStatus: string;
}): {
  pricingDelta: AdminBookingEditPricingDelta;
  paymentRequirement: AdminEditPaymentRequirement;
  nextPaymentStatus: string;
} {
  const difference = calculateEditPriceDifference(params.previousTotal, params.nextTotal);

  if (difference > 0 && !params.paymentMethod) {
    throw new PaymentMethodRequiredError();
  }

  if (difference > 0 && params.paymentMethod === "credit_card" && difference < MIN_CHARGE_THB) {
    throw new AmountTooLowError();
  }

  const paymentRequirement = params.paymentMethod
    ? resolveEditPaymentRequirement(params.paymentMethod, difference)
    : { requiresPayment: false as const };

  const nextPaymentStatus = paymentRequirement.requiresPayment
    ? paymentRequirement.paymentStatus
    : params.currentPaymentStatus;

  return {
    pricingDelta: { previousTotal: params.previousTotal, nextTotal: params.nextTotal, difference },
    paymentRequirement,
    nextPaymentStatus,
  };
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
  const pricePerNightSum = booking.rooms.reduce((sum, room) => sum + Number(room.pricePerNight), 0);

  const catalog = await getSpecialRequestCatalog();
  if (!validateStandardRequestCodes(catalog, input.standardRequests)) {
    throw new InvalidBookingTransitionError("One or more selected standard requests are invalid");
  }

  const selections: SpecialRequestSelection[] = input.specialRequests.map((item) => ({
    code: item.code,
    count: item.count,
  }));
  const pricing = await computeEditedBookingPricing({
    bookingId,
    nights,
    pricePerNightSum,
    specialRequestSelections: selections,
    promoCode: booking.promoCode,
  });

  const previousTotal = Number(booking.totalAmount);
  const { pricingDelta, paymentRequirement, nextPaymentStatus } = resolvePaymentDelta({
    previousTotal,
    nextTotal: pricing.totalAmount,
    paymentMethod: input.paymentMethod,
    currentPaymentStatus: booking.paymentStatus,
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      standardRequests: input.standardRequests,
      specialRequests: pricing.selectedSpecialRequests,
      addonsTotal: pricing.addonsTotal,
      additionalRequest: input.additionalRequest,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      paymentStatus: nextPaymentStatus,
    },
  });

  return {
    pricingDelta,
    paymentRequirement,
  };
}

export async function updateBookingDates(
  bookingId: string,
  input: AdminEditDatesInput,
): Promise<{
  pricingDelta: AdminBookingEditPricingDelta;
  paymentRequirement: AdminEditPaymentRequirement;
  nightsAdded: number;
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
      specialRequests: true,
      rooms: { select: { pricePerNight: true } },
    },
  });

  if (!booking) throw new BookingNotFoundError();

  const status = asBookingStatus(booking.status);
  const currentCheckIn = booking.checkIn.toISOString().slice(0, 10);
  const currentCheckOut = booking.checkOut.toISOString().slice(0, 10);

  const dateValidation = validateAdminDateChange({
    status,
    currentCheckIn,
    currentCheckOut,
    newCheckIn: input.checkIn,
    newCheckOut: input.checkOut,
  });
  if (!dateValidation.ok) {
    throw new InvalidBookingTransitionError(dateValidation.message);
  }

  if (input.checkIn === currentCheckIn && input.checkOut === currentCheckOut) {
    throw new InvalidBookingTransitionError("The selected dates match the current booking");
  }

  if (await hasAssignedRoomConflict(bookingId, input.checkIn, input.checkOut)) {
    throw new AdminBookingRoomConflictError();
  }

  const storedSpecialRequests = parseStoredSpecialRequests(booking.specialRequests);
  const specialRequestSelections = await selectionsFromStoredSpecialRequests(
    storedSpecialRequests,
    dateValidation.nextNights,
  );
  const pricePerNightSum = booking.rooms.reduce((sum, room) => sum + Number(room.pricePerNight), 0);
  const pricing = await computeEditedBookingPricing({
    bookingId,
    nights: dateValidation.nextNights,
    pricePerNightSum,
    specialRequestSelections,
    promoCode: booking.promoCode,
  });

  const previousTotal = Number(booking.totalAmount);
  const { pricingDelta, paymentRequirement, nextPaymentStatus } = resolvePaymentDelta({
    previousTotal,
    nextTotal: pricing.totalAmount,
    paymentMethod: input.paymentMethod,
    currentPaymentStatus: booking.paymentStatus,
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkIn: toDateOnly(input.checkIn),
      checkOut: toDateOnly(input.checkOut),
      specialRequests: pricing.selectedSpecialRequests,
      addonsTotal: pricing.addonsTotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      paymentStatus: nextPaymentStatus,
    },
  });

  return {
    pricingDelta,
    paymentRequirement,
    nightsAdded: dateValidation.nightsAdded,
  };
}
