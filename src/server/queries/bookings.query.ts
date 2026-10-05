import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { createNotification } from "@/server/queries/notifications.query";
import { PAYMENT_REQUIRES_REFUND } from "@/server/queries/payment-attempts.query";
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
      and b.customer_id is null
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
    throw new Error("Unable to verify the outstanding payment balance. Please try again.");
  }

  if (!Array.isArray(data)) throw new Error("Unable to verify payment records");
  const rows = data;
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
    ["confirmed", "checked_in"].includes(booking.status)
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
  return createPaymentAttempt(bookingId, amountThb, true);
}

export async function getAdminBookingPaymentState(bookingId: string) {
  const [booking] = await prisma.$queryRaw<{ status: string; payment_status: string }[]>`
    select status, payment_status from bookings where id = ${bookingId}::uuid`;
  if (!booking) throw new BookingNotFoundError();
  return { status: booking.status, paymentStatus: booking.payment_status };
}

export async function createInitialPaymentAttempt(
  bookingId: string,
  amountThb: number,
): Promise<{ clientSecret: string }> {
  return createPaymentAttempt(bookingId, amountThb, false);
}

// Serialize creation with cancellation and settlement. A secret is exposed only
// after its ledger row commits. Stripe calls have a bounded transaction timeout;
// an uncommitted new intent is torn down if any subsequent operation fails.
async function createPaymentAttempt(bookingId: string, amountThb: number, topUp: boolean) {
  if (amountThb < MIN_CHARGE_THB) {
    throw new AmountTooLowError(`Amount due must be at least THB ${MIN_CHARGE_THB}`);
  }
  let newIntentId: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      const [booking] = await tx.$queryRaw<{
        status: string; payment_status: string; total_amount: number; cancelled_at: Date | null;
      }[]>`select status, payment_status, total_amount, cancelled_at
           from bookings where id = ${bookingId}::uuid for update`;
      if (!booking || booking.cancelled_at || booking.payment_status !== "pending" ||
          !(topUp ? ["confirmed", "checked_in"].includes(booking.status) : booking.status === "pending_payment")) {
        throw new PaymentIntentBlockedError("This booking can no longer accept this payment");
      }
      const payments = await tx.$queryRaw<{
        stripe_payment_intent_id: string; status: string; amount: number;
      }[]>`select stripe_payment_intent_id, status, amount from payments
           where booking_id = ${bookingId}::uuid order by created_at`;
      const paid = payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + Number(p.amount), 0);
      const due = Math.max(0, Number(booking.total_amount) - paid);
      if (!Number.isFinite(due) || Math.round(due * 100) !== Math.round(amountThb * 100) || due < MIN_CHARGE_THB) {
        throw new PaymentIntentBlockedError("The outstanding balance changed. Please refresh before paying.");
      }
      for (const payment of payments) {
        if (["succeeded", "canceled"].includes(payment.status)) continue;
        const intent = await retrievePaymentIntent(payment.stripe_payment_intent_id);
        if (["succeeded", "processing", "requires_capture"].includes(intent.status)) {
          throw new PaymentIntentBlockedError("A payment is already going through. Please wait a moment.");
        }
        if (intent.status !== "canceled") await cancelPaymentIntent(intent.id);
        await tx.$executeRaw`update payments set status = 'canceled', updated_at = now()
          where stripe_payment_intent_id = ${intent.id}`;
      }
      const intent = await createBookingPaymentIntent({ bookingId, amountThb: due, ...(topUp ? { paymentKind: "top_up" as const } : {}) });
      newIntentId = intent.id;
      if (!intent.client_secret) throw new Error("Payment intent has no client secret");
      await tx.$executeRaw`insert into payments (booking_id, stripe_payment_intent_id, amount, currency, status, created_at)
        values (${bookingId}::uuid, ${intent.id}, ${due}, 'thb', 'requires_payment_method', clock_timestamp())`;
      return { clientSecret: intent.client_secret };
    }, { timeout: 30000 });
  } catch (error) {
    if (newIntentId) await cancelPaymentIntent(newIntentId).catch((cleanupError) => {
      console.error("[bookings] failed to cancel uncommitted intent:", cleanupError);
    });
    throw error;
  }
}

// Stripe settlement and failure transitions share the same booking lock used
// by payment creation and cancellation. Room locks serialize late settlement
// with new reservations; a declined card can still succeed on a later confirm.
export async function updateBookingPaymentStatus(
  bookingId: string,
  outcome: "paid" | "failed",
  confirmedMethod?: "credit_card" | "promptpay",
  intentId?: string,
  topUp = false,
  settledAt = new Date(),
): Promise<boolean> {
  const result = await prisma.$transaction(async (tx) => {
    const [booking] = await tx.$queryRaw<{
      status: string; payment_status: string; payment_method: string;
      cancelled_at: Date | null; created_at: Date; check_in: string; check_out: string;
    }[]>`select status, payment_status, payment_method, cancelled_at, created_at,
          to_char(check_in, 'YYYY-MM-DD') as check_in, to_char(check_out, 'YYYY-MM-DD') as check_out
         from bookings where id = ${bookingId}::uuid for update`;
    if (!booking) throw new BookingNotFoundError();
    let currentIntent = true;
    if (intentId) {
      const [latest] = await tx.$queryRaw<{ stripe_payment_intent_id: string; status: string; settlement_failure: string | null }[]>`
        select stripe_payment_intent_id, status,
          (select failure_message from payments where stripe_payment_intent_id = ${intentId}) as settlement_failure
        from payments where booking_id = ${bookingId}::uuid
        order by created_at desc, id desc limit 1`;
      currentIntent = latest?.stripe_payment_intent_id === intentId;
      if (outcome === "failed" && (!currentIntent || latest?.status === "succeeded")) return "ignored";
      if (outcome === "paid" && latest?.settlement_failure === PAYMENT_REQUIRES_REFUND) return "refund";
    }
    async function rejectPayment() {
      // Keep the reason on the attempt before contacting Stripe. Redelivery
      // must retry the refund, even if inventory becomes free or 72h elapses.
      if (intentId) await tx.$executeRaw`update payments set failure_message = ${PAYMENT_REQUIRES_REFUND}, updated_at = now()
        where stripe_payment_intent_id = ${intentId}`;
      return "refund" as const;
    }
    if (outcome === "failed") {
      if (topUp) {
        await tx.$executeRaw`update bookings set payment_status = 'pending' where id = ${bookingId}::uuid
          and status in ('confirmed', 'checked_in') and payment_status <> 'paid'`;
        return "ignored";
      }
      const claim = await tx.booking.updateMany({
        where: { id: bookingId, status: "pending_payment", paymentStatus: "pending" },
        data: { paymentStatus: "failed", status: "cancelled", expiresAt: null },
      });
      return claim.count === 1 ? "changed" : "ignored";
    }
    if (booking.cancelled_at || booking.status === "refunded") {
      // Previously captured money outside the cancellation grace period keeps
      // its policy. A charge made after cancellation must always be returned.
      const refund = booking.status === "refunded" || !booking.cancelled_at ||
        isRefundEligible(new Date(booking.created_at).toISOString(), new Date(booking.cancelled_at)) ||
        settledAt.getTime() >= Math.floor(new Date(booking.cancelled_at).getTime() / 1000) * 1000;
      return refund ? rejectPayment() : "ignored";
    }
    if (topUp && ["confirmed", "checked_in"].includes(booking.status)) {
      const [balance] = await tx.$queryRaw<{ due: number }[]>`
        select b.total_amount - coalesce(sum(p.amount) filter (where p.status = 'succeeded'), 0) as due
        from bookings b left join payments p on p.booking_id = b.id
        where b.id = ${bookingId}::uuid group by b.id`;
      if (!balance) throw new Error("Unable to read payment balance");
      await tx.$executeRaw`update bookings set payment_status = ${Number(balance.due) <= 0 ? "paid" : "pending"}
        where id = ${bookingId}::uuid`;
      return "settled";
    }
    if (topUp) return rejectPayment();
    // Redelivery of the original charge remains harmless after later admin edits.
    if (["confirmed", "checked_in", "completed"].includes(booking.status)) {
      return booking.payment_method === "cash" ? rejectPayment() : "settled";
    }
    if (!currentIntent) return rejectPayment();
    const retryable = booking.status === "pending_payment" ||
      (["cancelled", "canceled"].includes(booking.status) && booking.payment_status === "failed");
    if (!retryable) return rejectPayment();
    const rooms = await tx.$queryRaw<{ room_id: string; status: string }[]>`
      select br.room_id, r.status from booking_rooms br join rooms r on r.id = br.room_id
      where br.booking_id = ${bookingId}::uuid order by r.id for update of r`;
    const conflicts = rooms.length ? await tx.$queryRaw<{ count: bigint }[]>`
      select count(*) as count from booking_rooms br join bookings b on b.id = br.booking_id
      where br.room_id = any(array[${Prisma.join(rooms.map((r) => r.room_id))}]::uuid[])
        and b.id <> ${bookingId}::uuid
        and b.status not in (${Prisma.join(NON_BLOCKING_BOOKING_STATUSES)})
        and (b.expires_at is null or b.expires_at > now())
        and b.check_in < ${booking.check_out}::date and b.check_out > ${booking.check_in}::date
    ` : [];
    if (!rooms.length || rooms.some((r) => UNAVAILABLE_ROOM_STATUSES.includes(r.status)) ||
        Number(conflicts[0]?.count ?? 0) > 0) {
      await tx.booking.updateMany({ where: { id: bookingId },
        data: { status: "cancelled", paymentStatus: "failed", cancelledAt: new Date(), expiresAt: null } });
      return rejectPayment();
    }
    await tx.booking.updateMany({ where: { id: bookingId }, data: {
      ...(confirmedMethod ? { paymentMethod: confirmedMethod } : {}),
      status: "confirmed", paymentStatus: "paid", expiresAt: null,
    } });
    return "confirmed";
  });
  if (result === "refund" && intentId) {
    await refundPayment(intentId, `refund_${bookingId}_${intentId}`);
    await prisma.booking.updateMany({ where: { id: bookingId, status: "cancelled" }, data: { status: "refunded" } });
  }
  if (result === "confirmed") {
    await maybeSendGuestBookingConfirmationEmail(bookingId);
  }
  return ["confirmed", "settled", "changed"].includes(result);
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
  if (current.payment_status === "paid" && ["confirmed", "checked_in", "completed"].includes(current.status)) {
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
  if (intent.status !== "succeeded") {
    return { synced: false, paymentStatus: current.payment_status };
  }

  let confirmedMethod: "credit_card" | "promptpay" | undefined;
  let settledAt = new Date(intent.created * 1000);
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  if (intent.latest_charge) {
    const chargeId =
      typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge.id;
    try {
      const charge = await retrieveChargeWithCard(chargeId);
      settledAt = new Date(charge.created * 1000);
      cardBrand = charge.payment_method_details?.card?.brand ?? null;
      cardLast4 = charge.payment_method_details?.card?.last4 ?? null;
      const methodType = charge.payment_method_details?.type;
      confirmedMethod =
        methodType === "card" ? "credit_card" : methodType === "promptpay" ? "promptpay" : undefined;
    } catch (chargeError) {
      console.error("[bookings] syncPayment could not load charge details:", chargeError);
    }
  }

  const { error: paymentUpdateError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "succeeded",
      card_brand: cardBrand,
      card_last4: cardLast4,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intentId);
  if (paymentUpdateError) {
    console.error("[bookings] syncPayment could not update payment attempt:", paymentUpdateError);
    throw new Error("Could not update the payment record for this booking");
  }

  await updateBookingPaymentStatus(bookingId, "paid", confirmedMethod, intentId, intent.metadata.paymentKind === "top_up", settledAt);
  const [updated] = await prisma.$queryRaw<{ payment_status: string }[]>`
    select payment_status from bookings where id = ${bookingId}::uuid`;
  if (!updated) throw new BookingNotFoundError();
  return { synced: true, paymentStatus: updated.payment_status };
}

// Also used when a guest switches to Cash on a retry of /booking/payment for
// a booking originally created with Credit Card or PromptPay — without
// re-setting payment_method here, the booking would still show its original
// (unpaid) method even though the guest ended up paying at the hotel.
export async function markBookingCashConfirmed(bookingId: string): Promise<boolean> {
  const confirmed = await prisma.$transaction(async (tx) => {
    const bookings = await tx.$queryRaw<{
      status: string;
      payment_status: string;
      check_in: string;
      check_out: string;
    }[]>`
      select status, payment_status,
             to_char(check_in, 'YYYY-MM-DD') as check_in,
             to_char(check_out, 'YYYY-MM-DD') as check_out
      from bookings
      where id = ${bookingId}::uuid
      for update
    `;
    const booking = bookings[0];
    if (!booking || booking.status !== "pending_payment" || booking.payment_status !== "pending") {
      return false;
    }

    // Lock the assigned inventory before checking overlaps. This also makes an
    // expired hold safe to revive as cash: a new booking that took the room
    // wins first, and this conversion is rejected instead of double-booking it.
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
        and b.check_in < ${booking.check_out}::date
        and b.check_out > ${booking.check_in}::date
    `;
    if (Number(conflicts[0]?.count ?? 0) > 0) throw new BookingConflictError();

    const changed = await tx.booking.updateMany({
      where: { id: bookingId, status: "pending_payment", paymentStatus: "pending" },
      data: {
        paymentMethod: "cash",
        paymentStatus: "pay_at_hotel",
        status: "confirmed",
        expiresAt: null,
      },
    });
    return changed.count === 1;
  });

  if (confirmed) {
    await maybeSendGuestBookingConfirmationEmail(bookingId);
  }
  return confirmed;
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
          and cancelled_at is null
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

// Cancels a booking and refunds every captured Stripe payment, including
// top-ups created by later admin edits. The booking is atomically claimed as
// cancelled before contacting Stripe, which releases inventory and prevents
// concurrent lifecycle transitions. Per-intent idempotency keys make a retry
// safe if the request stops midway through multiple refunds; a cancelled row
// with captured payments is accepted specifically for that reconciliation.
export async function cancelBooking(
  bookingId: string,
  customerId: string | null,
): Promise<{ booking: BookingRecord; refunded: boolean }> {
  const booking = await getBookingById(bookingId, customerId);
  if (!booking) throw new BookingNotFoundError();

  const { payments, cancelledAt } = await prisma.$transaction(async (tx) => {
    const [current] = await tx.$queryRaw<{ status: string; cancelled_at: Date | null }[]>`
      select status, cancelled_at from bookings where id = ${bookingId}::uuid for update`;
    if (!current || ![...CANCELLABLE_STATUSES, "cancelled", "refunded"].includes(current.status)) {
      throw new InvalidBookingTransitionError("This booking can no longer be cancelled");
    }
    // Read every attempt, including still-payable declined cards and unpaid
    // top-ups. This read must succeed before releasing the booking.
    const attempts = await tx.$queryRaw<{ stripe_payment_intent_id: string; status: string; failure_message: string | null }[]>`
      select stripe_payment_intent_id, status, failure_message from payments
      where booking_id = ${bookingId}::uuid order by created_at`;
    const outstanding = attempts.filter((p) => !["succeeded", "canceled"].includes(p.status));
    if (outstanding.length) {
      await tx.$executeRaw`update payments set failure_message = ${PAYMENT_REQUIRES_REFUND}, updated_at = now()
        where stripe_payment_intent_id in (${Prisma.join(outstanding.map((p) => p.stripe_payment_intent_id))})`;
    }
    const at = current.cancelled_at ? new Date(current.cancelled_at) : new Date();
    if (current.status !== "refunded") {
      await tx.booking.updateMany({ where: { id: bookingId },
        data: { status: "cancelled", cancelledAt: at, expiresAt: null } });
    }
    return { payments: attempts, cancelledAt: at };
  });
  const refundEligible = isRefundEligible(booking.createdAt, cancelledAt);
  let refunded = booking.status === "refunded";
  for (const payment of payments) {
    // Stripe may already have captured the charge before its webhook arrives.
    let intent = await retrievePaymentIntent(payment.stripe_payment_intent_id);
    if (intent.status !== "succeeded" && intent.status !== "canceled") {
      try {
        await cancelPaymentIntent(intent.id);
      } catch (error) {
        // Confirmation can win the race with cancellation. Refund that money;
        // any other error is retried instead of reporting a successful cancel.
        intent = await retrievePaymentIntent(intent.id);
        if (intent.status !== "succeeded" && intent.status !== "canceled") throw error;
      }
    }
    if (intent.status === "succeeded" &&
        (refundEligible || payment.status !== "succeeded" || payment.failure_message === PAYMENT_REQUIRES_REFUND)) {
      await refundPayment(intent.id, `refund_${bookingId}_${intent.id}`);
      refunded = true;
    }
  }
  if (refunded) {
    await prisma.booking.updateMany({
      where: { id: bookingId, status: "cancelled" },
      data: { status: "refunded" },
    });
  }

  const updated = await getBookingById(bookingId, customerId);
  if (!updated) throw new BookingNotFoundError();

  await createNotification(
    customerId,
    refunded ? "booking_refunded" : "booking_cancelled",
    refunded
      ? `Your booking ${updated.bookingCode} was cancelled and refunded.`
      : `Your booking ${updated.bookingCode} was cancelled.`,
    "/booking-history",
  );

  return { booking: updated, refunded };
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
