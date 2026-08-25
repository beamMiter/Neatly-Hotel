import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { nightsBetween } from "@/features/booking/date-rules";
import { validatePromotionCode } from "@/server/queries/promo.query";
import {
  getSpecialRequestCatalog,
  resolveSelectedSpecialRequests,
  validateStandardRequestCodes,
} from "@/server/queries/special-requests.query";
import type {
  BookingPricing,
  BookingRecord,
  CreateBookingInput,
  SelectedSpecialRequest,
} from "@/types/booking";

const HOLD_MINUTES = 30;
// Stripe enforces a per-currency minimum charge (roughly 10 THB); anything
// below that after a discount is applied should fail cleanly at our layer
// instead of surfacing as an opaque Stripe error.
const MIN_CHARGE_THB = 10;
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
  if (input.guests > capacity) {
    throw new InvalidGuestsError(`This room fits a maximum of ${capacity} guests`);
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
  if (input.paymentMethod === "credit_card" && totalAmount < MIN_CHARGE_THB) {
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
                 additional_request, promo_code, discount_amount, created_at,
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

export async function getBookingById(id: string, customerId: string): Promise<BookingRecord | null> {
  const rows = await prisma.$queryRaw<Parameters<typeof toBookingRecord>[0][]>`
    select b.id, b.booking_code, b.customer_id, b.check_in, b.check_out, b.guests, b.status, b.total_amount,
           b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone,
           b.guest_date_of_birth, b.guest_country, b.standard_requests, b.special_requests,
           b.additional_request, b.promo_code, b.discount_amount, b.created_at,
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
    where b.id = ${id}::uuid and b.customer_id = ${customerId}::uuid
  `;

  const row = rows[0];
  if (!row) return null;
  const record = toBookingRecord(row);
  const typedRow = row as unknown as { card_brand: string | null; card_last4: string | null };
  return { ...record, cardBrand: typedRow.card_brand, cardLast4: typedRow.card_last4 };
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
           b.additional_request, b.promo_code, b.discount_amount, b.created_at,
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

// Called only from the Stripe webhook handler — the source of truth for
// payment state (see plan §9: client-side confirmPayment is advisory only).
export async function updateBookingPaymentStatus(bookingId: string, outcome: "paid" | "failed"): Promise<void> {
  const paymentStatus = outcome === "paid" ? "paid" : "failed";
  const status = outcome === "paid" ? "confirmed" : "cancelled";
  await prisma.$executeRaw`
    update bookings set payment_status = ${paymentStatus}, status = ${status}, expires_at = null
    where id = ${bookingId}::uuid
  `;
}

export async function markBookingCashConfirmed(bookingId: string): Promise<void> {
  await prisma.$executeRaw`
    update bookings set payment_status = 'pay_at_hotel', status = 'confirmed', expires_at = null
    where id = ${bookingId}::uuid
  `;
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
export async function extendBookingHold(bookingId: string, customerId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
      // Selected as text so the ::date casts below compare the same literal
      // form createPendingBooking uses. A Prisma `date` comes back as a
      // UTC-midnight Date, and timestamptz::date resolves in the session
      // timezone — on a non-UTC connection that silently shifts the overlap
      // window by a day.
      const bookings = await tx.$queryRaw<
        { check_in: string; check_out: string }[]
      >`
        select to_char(check_in, 'YYYY-MM-DD') as check_in,
               to_char(check_out, 'YYYY-MM-DD') as check_out
        from bookings
        where id = ${bookingId}::uuid and customer_id = ${customerId}::uuid
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
