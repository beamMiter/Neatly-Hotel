import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { createNotification } from "@/server/queries/notifications.query";
import {
  isChangeDateEligible,
  isRefundEligible,
  nightsBetween,
  validateStayDates,
} from "@/features/booking/date-rules";
import { validatePromotionCode } from "@/server/queries/promo.query";
import {
  getSpecialRequestCatalog,
  resolveSelectedSpecialRequests,
  validateStandardRequestCodes,
} from "@/server/queries/special-requests.query";
import {
  BookingAccessDeniedError,
  resolveBookingAccessOutcome,
} from "@/lib/booking-access";
import {
  cancelPaymentIntent,
  createBookingPaymentIntent,
  refundPayment,
  retrieveChargeWithCard,
  retrievePaymentIntent,
} from "@/server/payments/stripe";
import { maybeSendGuestBookingConfirmationEmail } from "@/server/services/booking-confirmation-email";
import type {
  BookingPricing,
  BookingRecord,
  CreateBookingInput,
  SelectedSpecialRequest,
  SpecialRequestSelection,
} from "@/types/booking";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";

const HOLD_MINUTES = 30;
// Stripe enforces a per-currency minimum charge (roughly 10 THB); anything
// below that after a discount is applied should fail cleanly at our layer
// instead of surfacing as an opaque Stripe error.
export const MIN_CHARGE_THB = 10;
const UNAVAILABLE_ROOM_STATUSES = ["Out of Order", "Out of Service", "Out of Inventory"];
const NON_BLOCKING_BOOKING_STATUSES = ["cancelled", "canceled", "completed", "refunded"];
const BOOKING_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1

export class RoomTypeNotFoundError extends Error {}
export class InvalidGuestsError extends Error {}
export class InvalidPromoError extends Error {}
export class AmountTooLowError extends Error {}
export class BookingConflictError extends Error {
  constructor() {
    super("This room type is no longer available for the selected dates");
  }
}

function generateBookingCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += BOOKING_CODE_CHARSET[crypto.randomInt(BOOKING_CODE_CHARSET.length)];
  }
  return `NB-${y}${m}${d}-${suffix}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2010"
    ? String((error as { meta?: { code?: unknown } }).meta?.code) === "23505"
    : String(error).includes("23505");
}

type PricingContext = {
  pricing: BookingPricing;
  selectedSpecialRequests: SelectedSpecialRequest[];
  resolvedPromoCode: string | null;
  capacity: number;
};

async function computePricing(input: CreateBookingInput): Promise<PricingContext> {
  const roomType = await prisma.roomType.findUnique({
    where: { id: input.roomTypeId },
    select: { basePrice: true, promotionPrice: true, capacity: true },
  });
  if (!roomType) throw new RoomTypeNotFoundError();

  const capacity = roomType.capacity ?? 0;
  // Guests can be split across the requested rooms (see booking-search.query.ts).
  if (input.guests > capacity * input.rooms) {
    throw new InvalidGuestsError(`This room fits a maximum of ${capacity} guests per room`);
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const perNight = Number(roomType.promotionPrice ?? roomType.basePrice ?? 0);
  const roomSubtotal = perNight * nights * input.rooms;

  const catalog = await getSpecialRequestCatalog();
  if (!validateStandardRequestCodes(catalog, input.standardRequests)) {
    throw new InvalidGuestsError("One or more selected standard requests are invalid");
  }
  const selectedSpecialRequests = resolveSelectedSpecialRequests(catalog, input.specialRequests, nights);
  const addonsTotal = selectedSpecialRequests.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // No code entered isn't a validation failure — skip the lookup entirely
  // rather than making validatePromotionCode() special-case an empty code.
  const trimmedPromoCode = input.promoCode?.trim();
  let discountAmount = 0;
  let resolvedPromoCode: string | null = null;
  if (trimmedPromoCode) {
    const promoResult = await validatePromotionCode({
      code: trimmedPromoCode,
      roomTypeId: input.roomTypeId,
      subtotal: roomSubtotal + addonsTotal,
    });
    if (!promoResult.valid) {
      throw new InvalidPromoError(promoResult.message);
    }
    discountAmount = promoResult.discountAmount;
    resolvedPromoCode = promoResult.code;
  }

  const totalAmount = roomSubtotal + addonsTotal - discountAmount;

  // Note the missing `totalAmount > 0` guard here is deliberate: a 100%-off
  // promo lands on exactly 0, which Stripe rejects the same way it rejects
  // 5 THB. Both need to fail here with a clear message rather than surfacing
  // as an opaque Stripe error after the booking row is already committed.
  // Any non-cash method goes through Stripe and hits the same per-currency
  // minimum — not just "credit_card" (promptpay is charged the same way).
  if (input.paymentMethod !== "cash" && totalAmount < MIN_CHARGE_THB) {
    throw new AmountTooLowError(`Total after discount must be at least THB ${MIN_CHARGE_THB}`);
  }

  return {
    pricing: {
      nights,
      roomSubtotal,
      addonsTotal,
      discountAmount,
      totalAmount,
    },
    selectedSpecialRequests,
    resolvedPromoCode,
    capacity,
  };
}

function toBookingRecord(row: {
  id: string;
  booking_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  check_in: Date | string;
  check_out: Date | string;
  guests: number;
  total_amount: number | string;
  room_type_id: string;
  room_type_name: string;
  rooms_count: number;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_date_of_birth: Date | string | null;
  guest_country: string | null;
  standard_requests: string[];
  // `quantity` is optional on the way in: rows written before add-ons became
  // countable don't have it. Normalised to a real number in toBookingRecord.
  special_requests: (Omit<SelectedSpecialRequest, "quantity"> & { quantity?: number })[];
  additional_request: string | null;
  promo_code: string | null;
  discount_amount: number | string;
  created_at: Date | string;
  cancelled_at: Date | string | null;
}): BookingRecord {
  const isoDate = (value: Date | string) => (value instanceof Date ? value.toISOString().slice(0, 10) : value);

  return {
    id: row.id,
    bookingCode: row.booking_code,
    status: row.status as BookingRecord["status"],
    paymentStatus: row.payment_status as BookingRecord["paymentStatus"],
    paymentMethod: row.payment_method as BookingRecord["paymentMethod"],
    checkIn: isoDate(row.check_in),
    checkOut: isoDate(row.check_out),
    guests: row.guests,
    totalAmount: Number(row.total_amount),
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name,
    rooms: row.rooms_count,
    guestInfo: {
      firstName: row.guest_first_name ?? "",
      lastName: row.guest_last_name ?? "",
      email: row.guest_email ?? "",
      phone: row.guest_phone ?? "",
      dateOfBirth: row.guest_date_of_birth ? isoDate(row.guest_date_of_birth) : "",
      country: row.guest_country ?? "",
    },
    standardRequests: row.standard_requests ?? [],
    // Bookings made before add-ons became countable stored no `quantity`.
    // Default those to 1 here (what they meant) so everything downstream can
    // trust the field rather than re-defending against it.
    specialRequests: (row.special_requests ?? []).map((item) => ({ ...item, quantity: item.quantity ?? 1 })),
    additionalRequest: row.additional_request,
    promoCode: row.promo_code,
    discountAmount: Number(row.discount_amount),
    cardBrand: null,
    cardLast4: null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    cancelledAt:
      row.cancelled_at == null
        ? null
        : row.cancelled_at instanceof Date
          ? row.cancelled_at.toISOString()
          : row.cancelled_at,
  };
}

// Creates a booking atomically: locks concrete physical rooms with
// `FOR UPDATE SKIP LOCKED` and inserts bookings + booking_rooms in the same
// Prisma transaction, so two concurrent requests for the last room can
// never both succeed. Reads for availability elsewhere in the app
// (booking-search.query.ts, room-availability.query.ts) go through a
// separate connection (PostgREST) and can't share this transaction — that's
// fine, since they only need to see the *result* once committed, not
// participate in the lock.
export async function createPendingBooking(
  input: CreateBookingInput,
): Promise<{ booking: BookingRecord; pricing: BookingPricing; expiresAt: string | null }> {
  const { pricing, selectedSpecialRequests, resolvedPromoCode } = await computePricing(input);

  const isCash = input.paymentMethod === "cash";
  const bookingId = crypto.randomUUID();
  const status = isCash ? "confirmed" : "pending_payment";
  const paymentStatus = isCash ? "pay_at_hotel" : "pending";
  const expiresAt = isCash ? null : new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  for (let attempt = 0; attempt < 3; attempt++) {
    const bookingCode = generateBookingCode();

    try {
      const row = await prisma.$transaction(async (tx) => {
        const lockedRooms = await tx.$queryRaw<{ id: string }[]>`
          select r.id
          from rooms r
          where r.room_type_id = ${input.roomTypeId}::uuid
            and r.status not in (${Prisma.join(UNAVAILABLE_ROOM_STATUSES)})
            and not exists (
              select 1
              from booking_rooms br
              join bookings b on b.id = br.booking_id
              where br.room_id = r.id
                and b.status not in (${Prisma.join(NON_BLOCKING_BOOKING_STATUSES)})
                and (b.expires_at is null or b.expires_at > now())
                and b.check_in < ${input.checkOut}::date
                and b.check_out > ${input.checkIn}::date
            )
          order by r.room_no
          limit ${input.rooms}
          for update skip locked
        `;

        if (lockedRooms.length < input.rooms) {
          throw new BookingConflictError();
        }

        await tx.$executeRaw`
          insert into bookings (
            id, booking_code, customer_id, check_in, check_out, guests, status, total_amount,
            guest_first_name, guest_last_name, guest_email, guest_phone,
            guest_date_of_birth, guest_country,
            standard_requests, special_requests, addons_total, additional_request,
            promo_code, discount_amount, payment_method, payment_status, expires_at
          ) values (
            ${bookingId}::uuid, ${bookingCode}, ${input.customerId}::uuid,
            ${input.checkIn}::date, ${input.checkOut}::date, ${input.guests}, ${status}, ${pricing.totalAmount},
            ${input.guestInfo.firstName}, ${input.guestInfo.lastName}, ${input.guestInfo.email}, ${input.guestInfo.phone},
            ${input.guestInfo.dateOfBirth}::date, ${input.guestInfo.country},
            ${JSON.stringify(input.standardRequests)}::jsonb, ${JSON.stringify(selectedSpecialRequests)}::jsonb,
            ${pricing.addonsTotal}, ${input.additionalRequest},
            ${resolvedPromoCode}, ${pricing.discountAmount}, ${input.paymentMethod}, ${paymentStatus}, ${expiresAt}
          )
        `;

        const roomType = await tx.roomType.findUniqueOrThrow({
          where: { id: input.roomTypeId },
          select: { name: true, basePrice: true, promotionPrice: true },
        });
        const pricePerNight = Number(roomType.promotionPrice ?? roomType.basePrice ?? 0);

        for (const room of lockedRooms) {
          await tx.$executeRaw`
            insert into booking_rooms (booking_id, room_id, price_per_night)
            values (${bookingId}::uuid, ${room.id}::uuid, ${pricePerNight})
          `;
        }

        const [inserted] = await tx.$queryRaw<Parameters<typeof toBookingRecord>[0][]>`
          select id, booking_code, customer_id, check_in, check_out, guests, status, total_amount,
                 guest_first_name, guest_last_name, guest_email, guest_phone,
                 guest_date_of_birth, guest_country, standard_requests, special_requests,
                 additional_request, promo_code, discount_amount, created_at, cancelled_at,
                 payment_method, payment_status, ${input.roomTypeId}::uuid as room_type_id,
                 ${roomType.name} as room_type_name, ${input.rooms}::int as rooms_count
          from bookings where id = ${bookingId}::uuid
        `;

        return inserted;
      });

      return { booking: toBookingRecord(row), pricing, expiresAt: expiresAt?.toISOString() ?? null };
    } catch (error) {
      if (error instanceof BookingConflictError) throw error;
      if (isUniqueViolation(error) && attempt < 2) continue; // booking_code collision, retry with a new code
      throw error;
    }
  }

  throw new Error("Failed to generate a unique booking code after multiple attempts");
}

export async function updatePendingBookingSpecialRequests(
  bookingId: string,
  selections: SpecialRequestSelection[],
): Promise<{ selectedSpecialRequests: SelectedSpecialRequest[]; addonsTotal: number; totalAmount: number }> {
  const catalog = await getSpecialRequestCatalog();

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      check_in: Date;
      check_out: Date;
      status: string;
      payment_status: string;
      total_amount: Prisma.Decimal;
      addons_total: Prisma.Decimal;
      discount_amount: Prisma.Decimal;
    }>>`
      select check_in, check_out, status, payment_status, total_amount, addons_total, discount_amount
      from bookings
      where id = ${bookingId}::uuid
      for update
    `;
    const booking = rows[0];
    if (!booking) throw new BookingNotFoundError();
    if (booking.status !== "pending_payment" || booking.payment_status !== "pending") {
      throw new InvalidBookingTransitionError("Special requests can only be changed before payment");
    }

    const toIsoDate = (value: Date | string) => value instanceof Date ? value.toISOString().slice(0, 10) : value;
    const nights = nightsBetween(toIsoDate(booking.check_in), toIsoDate(booking.check_out));
    const selectedSpecialRequests = resolveSelectedSpecialRequests(catalog, selections, nights);
    const addonsTotal = selectedSpecialRequests.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const roomSubtotal = Number(booking.total_amount) - Number(booking.addons_total) + Number(booking.discount_amount);
    const totalAmount = roomSubtotal + addonsTotal - Number(booking.discount_amount);

    await tx.$executeRaw`
      update bookings
      set special_requests = ${JSON.stringify(selectedSpecialRequests)}::jsonb,
          addons_total = ${addonsTotal},
          total_amount = ${totalAmount},
          updated_at = now()
      where id = ${bookingId}::uuid
    `;

    return { selectedSpecialRequests, addonsTotal, totalAmount };
  });
}

export async function getBookingById(id: string, customerId: string | null): Promise<BookingRecord | null> {
  const rows = await prisma.$queryRaw<
    (Parameters<typeof toBookingRecord>[0] & { customer_id: string | null; card_brand: string | null; card_last4: string | null })[]
  >`
    select b.id, b.booking_code, b.customer_id, b.check_in, b.check_out, b.guests, b.status, b.total_amount,
           b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone,
           b.guest_date_of_birth, b.guest_country, b.standard_requests, b.special_requests,
           b.additional_request, b.promo_code, b.discount_amount, b.created_at, b.cancelled_at,
           b.payment_method, b.payment_status,
           br.room_type_id, br.room_type_name, coalesce(brc.rooms_count, 0) as rooms_count,
           p.card_brand, p.card_last4
    from bookings b
    left join lateral (
      select r.room_type_id, rt.name as room_type_name
      from booking_rooms br2
      join rooms r on r.id = br2.room_id
      join room_types rt on rt.id = r.room_type_id
      where br2.booking_id = b.id limit 1
    ) br on true
    left join lateral (
      select count(*)::int as rooms_count from booking_rooms br3 where br3.booking_id = b.id
    ) brc on true
    left join lateral (
      select card_brand, card_last4 from payments
      where booking_id = b.id and status = 'succeeded'
      order by updated_at desc limit 1
    ) p on true
    where b.id = ${id}::uuid
  `;

  const row = rows[0];
  const outcome = resolveBookingAccessOutcome(Boolean(row), row?.customer_id ?? null, customerId);
  if (outcome === "not_found") return null;
  if (outcome === "forbidden") throw new BookingAccessDeniedError();

  const record = toBookingRecord(row);
  return { ...record, cardBrand: row.card_brand, cardLast4: row.card_last4 };
}

// Guest booking lookup — both booking_code and guest_email must match.
// Email compare is case-insensitive; booking codes are stored uppercase.
export async function lookupBookingByCodeAndEmail(
  bookingCode: string,
  email: string,
): Promise<BookingRecord | null> {
  const normalizedCode = bookingCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedCode || !normalizedEmail) return null;

  const rows = await prisma.$queryRaw<Parameters<typeof toBookingRecord>[0][]>`
    select b.id, b.booking_code, b.customer_id, b.check_in, b.check_out, b.guests, b.status, b.total_amount,
           b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone,
           b.guest_date_of_birth, b.guest_country, b.standard_requests, b.special_requests,
           b.additional_request, b.promo_code, b.discount_amount, b.created_at, b.cancelled_at,
           b.payment_method, b.payment_status,
           br.room_type_id, br.room_type_name, coalesce(brc.rooms_count, 0) as rooms_count,
           p.card_brand, p.card_last4
    from bookings b
    left join lateral (
      select r.room_type_id, rt.name as room_type_name
      from booking_rooms br2
      join rooms r on r.id = br2.room_id
      join room_types rt on rt.id = r.room_type_id
      where br2.booking_id = b.id limit 1
    ) br on true
    left join lateral (
      select count(*)::int as rooms_count from booking_rooms br3 where br3.booking_id = b.id
    ) brc on true
    left join lateral (
      select card_brand, card_last4 from payments
      where booking_id = b.id and status = 'succeeded'
      order by updated_at desc limit 1
    ) p on true
    where upper(b.booking_code) = ${normalizedCode}
      and lower(trim(b.guest_email)) = ${normalizedEmail}
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;
  const record = toBookingRecord(row);
  const typedRow = row as unknown as { card_brand: string | null; card_last4: string | null };
  return { ...record, cardBrand: typedRow.card_brand, cardLast4: typedRow.card_last4 };
}

export type BookingPaymentBalance = {
  totalAmount: number;
  paidAmount: number;
  amountDue: number;
  cardBrand: string | null;
  cardLast4: string | null;
};

export async function getBookingPaymentBalance(bookingId: string): Promise<BookingPaymentBalance> {
  const bookingRows = await prisma.$queryRaw<{ total_amount: number }[]>`
    select total_amount from bookings where id = ${bookingId}::uuid
  `;
  if (bookingRows.length === 0) {
    throw new BookingNotFoundError();
  }

  const totalAmount = Number(bookingRows[0].total_amount);
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("amount, card_brand, card_last4, status, updated_at")
    .eq("booking_id", bookingId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[bookings] failed to fetch payment balance:", error);
    return {
      totalAmount,
      paidAmount: 0,
      amountDue: totalAmount,
      cardBrand: null,
      cardLast4: null,
    };
  }

  const rows = data ?? [];
  const paidAmount = rows
    .filter((row) => row.status === "succeeded")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const latestSuccess = rows.find((row) => row.status === "succeeded");

  return {
    totalAmount,
    paidAmount,
    amountDue: Math.max(0, totalAmount - paidAmount),
    cardBrand: latestSuccess?.card_brand ?? null,
    cardLast4: latestSuccess?.card_last4 ?? null,
  };
}

export function isTopUpPaymentEligible(
  booking: BookingRecord,
  balance: Pick<BookingPaymentBalance, "amountDue">,
): boolean {
  return (
    balance.amountDue > 0 &&
    booking.paymentStatus === "pending" &&
    booking.status !== "pending_payment"
  );
}

export class TopUpNotEligibleError extends Error {
  constructor(message = "This booking has no outstanding card payment to collect") {
    super(message);
  }
}

export class PaymentIntentBlockedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type PriorIntentResolution =
  | { priorIntentToCancel: string | null }
  | { blocked: string }
  | { readError: true };

export async function resolvePriorIntentToCancel(bookingId: string): Promise<PriorIntentResolution> {
  const { data: priorPayments, error: priorError } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id, status")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (priorError) {
    console.error("[bookings] could not read prior payments:", priorError);
    return { readError: true };
  }

  const prior = priorPayments?.[0];
  if (!prior || prior.status === "canceled" || prior.status === "succeeded") {
    return { priorIntentToCancel: null };
  }

  try {
    const priorStatus = (await retrievePaymentIntent(prior.stripe_payment_intent_id)).status;
    if (["succeeded", "processing", "requires_capture"].includes(priorStatus)) {
      return {
        blocked: "A payment for this booking is already going through. Please wait a moment.",
      };
    }
    return { priorIntentToCancel: prior.stripe_payment_intent_id };
  } catch (error) {
    console.error("[bookings] could not read the prior intent:", error);
    return { readError: true };
  }
}

export async function createTopUpPaymentAttempt(
  bookingId: string,
  amountThb: number,
): Promise<{ clientSecret: string }> {
  if (amountThb < MIN_CHARGE_THB) {
    throw new AmountTooLowError(`Amount due must be at least THB ${MIN_CHARGE_THB}`);
  }

  const priorResolution = await resolvePriorIntentToCancel(bookingId);
  if ("readError" in priorResolution) {
    throw new Error("Failed to create a new payment attempt");
  }
  if ("blocked" in priorResolution) {
    throw new PaymentIntentBlockedError(priorResolution.blocked);
  }

  const paymentIntent = await createBookingPaymentIntent({
    bookingId,
    amountThb,
    paymentKind: "top_up",
  });

  const { error: insertError } = await supabaseAdmin.from("payments").insert({
    booking_id: bookingId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: amountThb,
    currency: "thb",
    status: "requires_payment_method",
  });

  if (insertError) {
    console.error("[bookings] failed to insert top-up payments row:", insertError);
    await cancelPaymentIntent(paymentIntent.id).catch((error) => {
      console.error("[bookings] failed to cancel orphaned top-up intent:", error);
    });
    throw new Error("Failed to create a new payment attempt");
  }

  if (priorResolution.priorIntentToCancel) {
    await cancelPaymentIntent(priorResolution.priorIntentToCancel).catch((error) => {
      console.error("[bookings] could not cancel the superseded top-up intent:", error);
    });
  }

  if (!paymentIntent.client_secret) {
    throw new Error("Failed to create a new payment attempt");
  }

  return { clientSecret: paymentIntent.client_secret };
}

// Top-up on confirmed/checked-in bookings: adjust payment_status only — never
// cancel the stay when a card charge fails or is abandoned.
export async function applyTopUpPaymentOutcome(bookingId: string, outcome: "paid" | "failed"): Promise<void> {
  if (outcome === "failed") {
    await prisma.$executeRaw`
      update bookings set payment_status = 'pending' where id = ${bookingId}::uuid
    `;
    return;
  }

  const balance = await getBookingPaymentBalance(bookingId);
  const paymentStatus = balance.amountDue <= 0 ? "paid" : "pending";
  await prisma.$executeRaw`
    update bookings set payment_status = ${paymentStatus} where id = ${bookingId}::uuid
  `;
}

// Called only from the Stripe webhook handler — the source of truth for
// payment state (see plan §9: client-side confirmPayment is advisory only).
//
// `confirmedMethod` is the method Stripe actually settled the charge with
// (read from the charge's `payment_method_details.type` in the webhook), not
// whatever the guest had selected when this payment attempt started. A retry
// via /booking/payment can switch between Credit Card and PromptPay between
// attempts — without this, `bookings.payment_method` would keep showing
// whichever method the *first* attempt on this booking used, even after a
// later attempt actually settled with a different one.
export async function updateBookingPaymentStatus(
  bookingId: string,
  outcome: "paid" | "failed",
  confirmedMethod?: "credit_card" | "promptpay",
): Promise<void> {
  const previous = await prisma.$queryRaw<{ status: string }[]>`
    select status from bookings where id = ${bookingId}::uuid limit 1
  `;
  const wasAlreadyConfirmed = previous[0]?.status === "confirmed";

  const paymentStatus = outcome === "paid" ? "paid" : "failed";
  const status = outcome === "paid" ? "confirmed" : "cancelled";
  await prisma.$executeRaw`
    update bookings
    set payment_method = coalesce(${confirmedMethod ?? null}, payment_method),
        payment_status = ${paymentStatus}, status = ${status}, expires_at = null
    where id = ${bookingId}::uuid
  `;

  // Guest confirmation email only on the first transition into confirmed.
  // Webhook redeliveries (already confirmed) must not send again.
  if (outcome === "paid" && !wasAlreadyConfirmed) {
    await maybeSendGuestBookingConfirmationEmail(bookingId);
  }
}

/**
 * Confirms a card/PromptPay booking by asking Stripe directly — used when the
 * webhook is slow or missing (typical in local `next dev` without
 * `stripe listen`). Idempotent if the booking is already paid.
 *
 * Still trusts Stripe as source of truth: we only mark paid when the latest
 * PaymentIntent for this booking is `succeeded`.
 */
export async function syncBookingPaymentFromStripe(bookingId: string): Promise<{
  synced: boolean;
  paymentStatus: string;
}> {
  const bookingRows = await prisma.$queryRaw<{ status: string; payment_status: string }[]>`
    select status, payment_status from bookings where id = ${bookingId}::uuid limit 1
  `;
  if (bookingRows.length === 0) {
    throw new BookingNotFoundError();
  }

  const current = bookingRows[0];
  if (current.payment_status === "paid" || current.status === "confirmed") {
    return { synced: false, paymentStatus: current.payment_status };
  }

  const { data: payments, error } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id, status")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[bookings] syncPayment could not read payments:", error);
    throw new Error("Could not read payment records for this booking");
  }

  const intentId = payments?.[0]?.stripe_payment_intent_id;
  if (!intentId) {
    return { synced: false, paymentStatus: current.payment_status };
  }

  const intent = await retrievePaymentIntent(intentId);
  if (intent.metadata.paymentKind === "top_up") {
    return { synced: false, paymentStatus: current.payment_status };
  }

  if (intent.status !== "succeeded") {
    return { synced: false, paymentStatus: current.payment_status };
  }

  let confirmedMethod: "credit_card" | "promptpay" | undefined;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  if (intent.latest_charge) {
    const chargeId =
      typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge.id;
    try {
      const charge = await retrieveChargeWithCard(chargeId);
      cardBrand = charge.payment_method_details?.card?.brand ?? null;
      cardLast4 = charge.payment_method_details?.card?.last4 ?? null;
      const methodType = charge.payment_method_details?.type;
      confirmedMethod =
        methodType === "card" ? "credit_card" : methodType === "promptpay" ? "promptpay" : undefined;
    } catch (chargeError) {
      console.error("[bookings] syncPayment could not load charge details:", chargeError);
    }
  }

  await supabaseAdmin
    .from("payments")
    .update({
      status: "succeeded",
      card_brand: cardBrand,
      card_last4: cardLast4,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intentId);

  await updateBookingPaymentStatus(bookingId, "paid", confirmedMethod);
  return { synced: true, paymentStatus: "paid" };
}

// Also used when a guest switches to Cash on a retry of /booking/payment for
// a booking originally created with Credit Card or PromptPay — without
// re-setting payment_method here, the booking would still show its original
// (unpaid) method even though the guest ended up paying at the hotel.
export async function markBookingCashConfirmed(bookingId: string): Promise<void> {
  const previous = await prisma.$queryRaw<{ status: string }[]>`
    select status from bookings where id = ${bookingId}::uuid limit 1
  `;
  const wasAlreadyConfirmed = previous[0]?.status === "confirmed";

  await prisma.$executeRaw`
    update bookings set payment_method = 'cash', payment_status = 'pay_at_hotel', status = 'confirmed', expires_at = null
    where id = ${bookingId}::uuid
  `;

  // Cash create already inserts status=confirmed, so this path often finds
  // wasAlreadyConfirmed=true — the create API then calls maybeSend explicitly.
  // Retry pay-at-hotel (pending → confirmed) sends from here.
  if (!wasAlreadyConfirmed) {
    await maybeSendGuestBookingConfirmationEmail(bookingId);
  }
}

// Revives a booking for a retry attempt — used by
// POST /api/bookings/[id]/payment-intent. Returns false if the booking is
// no longer retryable (already paid, or its rooms were taken in the meantime).
//
// Two things make this more than a simple `expires_at` bump:
//  1. A declined card fires payment_failed, which cancels the booking to
//     release its rooms immediately, so the retryable state is
//     cancelled/failed — not pending_payment. Matching only the latter made
//     "Try Again" always 409.
//  2. Releasing those rooms means someone else may have booked them by now.
//     Re-run the same overlap check createPendingBooking uses before handing
//     back a hold, otherwise a retry can re-claim already-sold inventory.
export async function extendBookingHold(bookingId: string, customerId: string | null): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
      const owner = await tx.$queryRaw<{ customer_id: string | null }[]>`
        select customer_id from bookings where id = ${bookingId}::uuid
      `;
      const access = resolveBookingAccessOutcome(
        owner.length > 0,
        owner[0]?.customer_id ?? null,
        customerId,
      );
      if (access === "forbidden") throw new BookingAccessDeniedError();
      if (access === "not_found") return false;

      const bookings = await tx.$queryRaw<
        { check_in: string; check_out: string }[]
      >`
        select to_char(check_in, 'YYYY-MM-DD') as check_in,
               to_char(check_out, 'YYYY-MM-DD') as check_out
        from bookings
        where id = ${bookingId}::uuid
          and payment_status in ('pending', 'failed')
          and status in ('pending_payment', 'cancelled', 'canceled')
        for update
      `;
      if (bookings.length === 0) return false;

      // Lock this booking's own rooms so a concurrent createPendingBooking
      // can't claim them between the check below and the update.
      const rooms = await tx.$queryRaw<{ room_id: string }[]>`
        select br.room_id
        from booking_rooms br
        join rooms r on r.id = br.room_id
        where br.booking_id = ${bookingId}::uuid
        for update of r
      `;
      if (rooms.length === 0) return false;

      const conflicts = await tx.$queryRaw<{ count: bigint }[]>`
        select count(*) as count
        from booking_rooms br
        join bookings b on b.id = br.booking_id
        where br.room_id = any(array[${Prisma.join(rooms.map((room) => room.room_id))}]::uuid[])
          and b.id <> ${bookingId}::uuid
          and b.status not in (${Prisma.join(NON_BLOCKING_BOOKING_STATUSES)})
          and (b.expires_at is null or b.expires_at > now())
          and b.check_in < ${bookings[0].check_out}::date
          and b.check_out > ${bookings[0].check_in}::date
      `;
      if (Number(conflicts[0]?.count ?? 0) > 0) return false;

      await tx.$executeRaw`
        update bookings
        set expires_at = ${new Date(Date.now() + HOLD_MINUTES * 60 * 1000)},
            status = 'pending_payment',
            payment_status = 'pending'
        where id = ${bookingId}::uuid
      `;
      return true;
  });
  // Deliberately no catch: `false` means "this booking is genuinely not
  // retryable", which the route turns into a 409 telling the guest to start
  // over. A dropped connection or deadlock is not that — let it surface as a
  // 500 so the guest can simply try again.
}

// Exported so the /refund and /cancel-booking pages can decide whether to
// show the pre-cancel confirmation view without duplicating this list.
export const CANCELLABLE_STATUSES: BookingRecord["status"][] = ["pending_payment", "confirmed"];
const CHANGEABLE_STATUSES: BookingRecord["status"][] = ["pending_payment", "confirmed"];

// Cancels a booking and, when the guest cancels within the refund window
// (isRefundEligible — see date-rules.ts), refunds the original Stripe
// charge. No new payments-table migration: the refund outcome is recorded
// only as booking.status = "refunded" (already a legal DB value, see
// NON_BLOCKING_BOOKING_STATUSES above); the payments row itself is left as
// "succeeded" rather than mutated, a known/accepted gap for now.
//
// Double-refund guard: the status transition is claimed atomically (via
// updateMany's WHERE) *before* Stripe is called, not after. Two concurrent
// cancel requests for the same booking (double-click, two tabs, a retry)
// would otherwise both read the pre-cancel status and both issue a Stripe
// refund; with the claim first, only the request that actually flips the
// row proceeds to call Stripe — the loser sees claim.count === 0 and fails
// with InvalidBookingTransitionError before ever touching Stripe.
export async function cancelBooking(
  bookingId: string,
  customerId: string | null,
): Promise<{ booking: BookingRecord; refunded: boolean }> {
  const booking = await getBookingById(bookingId, customerId);
  if (!booking) throw new BookingNotFoundError();

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new InvalidBookingTransitionError("This booking can no longer be cancelled");
  }

  let paymentIntentId: string | null = null;

  // Same reasoning as the min-charge gate above: any method that actually
  // went through Stripe (card or promptpay) has a real payment_intent to
  // refund — only "cash" never does.
  if (isRefundEligible(booking.createdAt) && booking.paymentMethod !== "cash" && booking.paymentStatus === "paid") {
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("booking_id", bookingId)
      .eq("status", "succeeded")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[payments] failed to look up payment intent for refund:", error);
    } else if (payment?.stripe_payment_intent_id) {
      paymentIntentId = payment.stripe_payment_intent_id;
    }
  }

  const finalStatus = paymentIntentId ? "refunded" : "cancelled";
  const cancelledAt = new Date();

  const claim = await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: CANCELLABLE_STATUSES } },
    data: { status: finalStatus, cancelledAt },
  });

  if (claim.count === 0) {
    throw new InvalidBookingTransitionError("This booking can no longer be cancelled");
  }

  if (paymentIntentId) {
    try {
      await refundPayment(paymentIntentId, `refund_${bookingId}`);
    } catch (error) {
      // We already claimed "refunded" but Stripe didn't actually refund —
      // roll back to "cancelled" rather than leave the booking claiming a
      // refund that never happened. Still genuinely cancelled at the same
      // moment, so cancelledAt is unaffected.
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
      throw error;
    }
  }

  const updated = await getBookingById(bookingId, customerId);
  if (!updated) throw new BookingNotFoundError();

  await createNotification(
    customerId,
    finalStatus === "refunded" ? "booking_refunded" : "booking_cancelled",
    finalStatus === "refunded"
      ? `Your booking ${updated.bookingCode} was cancelled and refunded.`
      : `Your booking ${updated.bookingCode} was cancelled.`,
    "/booking-history",
  );

  return { booking: updated, refunded: finalStatus === "refunded" };
}

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

// Changes a confirmed booking's stay dates — only within the change-date
// window (isChangeDateEligible), only for the same number of nights (no
// re-pricing needed, matches the "locked-nights" picker UI), only onto
// dates that actually pass the same validation booking creation uses (not
// in the past), and only if this booking's own rooms are actually free for
// the new range (excludes its own row from the overlap check).
//
// Double-booking guard: the room-lock + conflict-check + update run inside
// one transaction, locking this booking's rooms with `for update of r`
// before checking for conflicts — same pattern extendBookingHold already
// uses. Without this, two concurrent change-date requests for two
// bookings that share a room could both read "no conflict" before either
// commits, and both succeed onto the same overlapping dates.
export async function changeBookingDates(
  bookingId: string,
  customerId: string | null,
  checkIn: string,
  checkOut: string,
): Promise<BookingRecord> {
  const booking = await getBookingById(bookingId, customerId);
  if (!booking) throw new BookingNotFoundError();

  if (!CHANGEABLE_STATUSES.includes(booking.status)) {
    throw new InvalidBookingTransitionError("This booking's dates can no longer be changed");
  }

  if (!isChangeDateEligible(booking.createdAt)) {
    throw new InvalidBookingTransitionError("Date changes are only allowed within 3 days of booking");
  }

  const dateError = validateStayDates(checkIn, checkOut);
  if (dateError) {
    throw new InvalidBookingTransitionError(dateError);
  }

  const originalNights = nightsBetween(booking.checkIn, booking.checkOut);
  const requestedNights = nightsBetween(checkIn, checkOut);
  if (requestedNights !== originalNights) {
    throw new InvalidBookingTransitionError(
      `The new dates must be ${originalNights} night${originalNights === 1 ? "" : "s"}, same as the original booking`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const rooms = await tx.$queryRaw<{ room_id: string }[]>`
      select br.room_id
      from booking_rooms br
      join rooms r on r.id = br.room_id
      where br.booking_id = ${bookingId}::uuid
      for update of r
    `;

    if (rooms.length > 0) {
      const conflicts = await tx.$queryRaw<{ count: bigint }[]>`
        select count(*) as count
        from booking_rooms br
        join bookings b on b.id = br.booking_id
        where br.room_id = any(array[${Prisma.join(rooms.map((room) => room.room_id))}]::uuid[])
          and b.id <> ${bookingId}::uuid
          and b.status not in (${Prisma.join(NON_BLOCKING_BOOKING_STATUSES)})
          and (b.expires_at is null or b.expires_at > now())
          and b.check_in < ${checkOut}::date
          and b.check_out > ${checkIn}::date
      `;
      if (Number(conflicts[0]?.count ?? 0) > 0) {
        throw new BookingConflictError();
      }
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { checkIn: toDateOnly(checkIn), checkOut: toDateOnly(checkOut) },
    });
  });

  const updated = await getBookingById(bookingId, customerId);
  if (!updated) throw new BookingNotFoundError();

  await createNotification(
    customerId,
    "booking_date_changed",
    `Your booking ${updated.bookingCode} dates were updated.`,
    "/booking-history",
  );

  return updated;
}
