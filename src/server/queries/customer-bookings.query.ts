import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/server/db";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { getSpecialRequestCatalogForDisplay } from "@/server/queries/special-requests.query";
import type { BookingPaymentStatus, BookingStatus, SelectedSpecialRequest } from "@/types/booking";
import type { CustomerBookingSummary, CustomerBookingDetail } from "@/types/customer-booking";

export const CUSTOMER_BOOKINGS_PAGE_SIZE = 10;

const BOOKING_SELECT =
  "id, booking_code, customer_id, check_in, check_out, guests, status, payment_status, total_amount, created_at, guest_first_name, guest_last_name, guest_email, booking_rooms(price_per_night, rooms(room_no, room_type, bed_type))";

// Detail-only: the list view has no use for the itemized breakdown, so it
// stays on the lighter BOOKING_SELECT above.
const BOOKING_DETAIL_SELECT = `${BOOKING_SELECT}, standard_requests, special_requests, additional_request, promo_code, discount_amount, payment_method`;
const CHECK_IN_ROOM_STATUS = "Occupied";
const CHECK_OUT_ROOM_STATUS = "Vacant Dirty";

type BookingRoomRow = {
  price_per_night: number | string;
  rooms: { room_no: string; room_type: string; bed_type: string } | null;
};

type BookingRow = {
  id: string;
  booking_code: string;
  customer_id: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  payment_status: string;
  total_amount: number | string;
  created_at: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  booking_rooms: BookingRoomRow[] | null;
};

// `quantity` is optional on the way in: rows written before add-ons became
// countable don't have it (mirrors bookings.query.ts's toBookingRecord).
type StoredSpecialRequest = Omit<SelectedSpecialRequest, "quantity"> & { quantity?: number };

type BookingDetailRow = BookingRow & {
  standard_requests: string[] | null;
  special_requests: StoredSpecialRequest[] | null;
  additional_request: string | null;
  promo_code: string | null;
  discount_amount: number | string | null;
  payment_method: string | null;
};

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
  }
}

export class InvalidBookingTransitionError extends Error {
  constructor(message: string) {
    super(message);
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

function asPaymentStatus(value: string): BookingPaymentStatus {
  if (value === "pending" || value === "paid" || value === "failed" || value === "pay_at_hotel") {
    return value;
  }
  return "pending";
}

function summarizeDistinct(values: (string | null | undefined)[]): string {
  const distinct = Array.from(new Set(values.filter((value): value is string => Boolean(value))));
  if (distinct.length === 0) return "-";
  if (distinct.length === 1) return distinct[0];
  return `${distinct[0]} +${distinct.length - 1} more`;
}

// Bookings snapshot the guest's name at booking time (bookings.guest_*),
// preferred when present. Older bookings fall back to the live profile name.
function resolveCustomerName(
  guestFirstName: string | null,
  guestLastName: string | null,
  profileName: string,
): string {
  const guestName = `${guestFirstName ?? ""} ${guestLastName ?? ""}`.trim();
  return guestName || profileName;
}

async function fetchSuccessfulPayment(bookingId: string): Promise<{ cardBrand: string | null; cardLast4: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("card_brand, card_last4")
    .eq("booking_id", bookingId)
    .eq("status", "succeeded")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[payments] failed to fetch card details:", error);
    return { cardBrand: null, cardLast4: null };
  }

  return { cardBrand: data?.card_brand ?? null, cardLast4: data?.card_last4 ?? null };
}

async function resolveStandardRequestLabels(codes: string[]): Promise<string[]> {
  if (codes.length === 0) return [];
  const catalog = await getSpecialRequestCatalogForDisplay();
  const labelByCode = new Map(catalog.map((option) => [option.code, option.label]));
  return codes.map((code) => labelByCode.get(code) ?? code);
}

async function customerNamesByProfileId(customerIds: string[]): Promise<Map<string, string>> {
  const ids = customerIds.filter(Boolean);
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", ids);

  if (error) {
    console.error("[profiles] failed to fetch customer names:", error);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.id as string, `${row.first_name} ${row.last_name}`.trim()]));
}

function toSummary(row: BookingRow, customerName: string): CustomerBookingSummary {
  const rooms = row.booking_rooms ?? [];
  return {
    id: row.id,
    customerName,
    guests: row.guests,
    roomType: summarizeDistinct(rooms.map((room) => room.rooms?.room_type)),
    amount: rooms.length,
    bedType: summarizeDistinct(rooms.map((room) => room.rooms?.bed_type)),
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: asBookingStatus(row.status),
  };
}

function asPaymentMethod(value: string | null): "credit_card" | "cash" {
  return value === "cash" ? "cash" : "credit_card";
}

async function toDetail(
  row: BookingDetailRow,
  customerName: string,
  card: { cardBrand: string | null; cardLast4: string | null }
): Promise<CustomerBookingDetail> {
  const rooms = row.booking_rooms ?? [];
  const nights = differenceInCalendarDays(new Date(row.check_out), new Date(row.check_in));
  const roomSubtotal = rooms.reduce((sum, room) => sum + Number(room.price_per_night), 0) * nights;
  const standardRequests = await resolveStandardRequestLabels(row.standard_requests ?? []);

  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerName,
    guests: row.guests,
    roomType: summarizeDistinct(rooms.map((room) => room.rooms?.room_type)),
    amount: rooms.length,
    bedType: summarizeDistinct(rooms.map((room) => room.rooms?.bed_type)),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights,
    bookingDate: row.created_at,
    totalAmount: Number(row.total_amount),
    status: asBookingStatus(row.status),
    paymentStatus: asPaymentStatus(row.payment_status),
    roomNos: rooms.map((room) => room.rooms?.room_no).filter((value): value is string => Boolean(value)),
    paymentMethod: asPaymentMethod(row.payment_method),
    cardBrand: card.cardBrand,
    cardLast4: card.cardLast4,
    roomSubtotal,
    standardRequests,
    specialRequests: (row.special_requests ?? []).map((item) => ({
      label: item.label,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
    additionalRequest: row.additional_request,
    promoCode: row.promo_code,
    discountAmount: Number(row.discount_amount ?? 0),
  };
}

type GetCustomerBookingsParams = { query?: string; page?: number };
type GetCustomerBookingsResult = { bookings: CustomerBookingSummary[]; totalPages: number };

export async function getCustomerBookings({
  query,
  page = 1,
}: GetCustomerBookingsParams): Promise<GetCustomerBookingsResult> {
  const supabase = supabaseAdmin;

  const from = (page - 1) * CUSTOMER_BOOKINGS_PAGE_SIZE;
  const to = from + CUSTOMER_BOOKINGS_PAGE_SIZE - 1;

  let request = supabase
    .from("bookings")
    .select(BOOKING_SELECT, { count: "exact" })
    .order("check_in", { ascending: true })
    .range(from, to);

  if (query) {
    let profileQuery = supabase.from("profiles").select("id");
    for (const word of query.split(/\s+/).filter(Boolean)) {
      profileQuery = profileQuery.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%`);
    }
    const { data: matchedProfiles } = await profileQuery;
    const matchingCustomerIds = (matchedProfiles ?? []).map((profile) => profile.id as string);

    const filters = [
      `booking_code.ilike.%${query}%`,
      `guest_first_name.ilike.%${query}%`,
      `guest_last_name.ilike.%${query}%`,
      `guest_email.ilike.%${query}%`,
    ];
    if (matchingCustomerIds.length > 0) {
      filters.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
    }
    request = request.or(filters.join(","));
  }

  const { data, count, error } = await request;

  if (error) {
    console.error("[bookings] failed to fetch bookings:", error);
    return { bookings: [], totalPages: 1 };
  }

  const rows = (data ?? []) as unknown as BookingRow[];
  const nameByCustomerId = await customerNamesByProfileId(
    rows.map((row) => row.customer_id).filter((id): id is string => Boolean(id)),
  );

  const bookings = rows.map((row) =>
    toSummary(
      row,
      resolveCustomerName(
        row.guest_first_name,
        row.guest_last_name,
        row.customer_id ? (nameByCustomerId.get(row.customer_id) ?? "Unknown") : "Guest",
      ),
    ),
  );
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / CUSTOMER_BOOKINGS_PAGE_SIZE));

  return { bookings, totalPages };
}

export async function getCustomerBookingById(id: string): Promise<CustomerBookingDetail | null> {
  const { data, error } = await supabaseAdmin.from("bookings").select(BOOKING_DETAIL_SELECT).eq("id", id).single();

  if (error || !data) {
    console.error("[bookings] failed to fetch booking detail:", error);
    return null;
  }
  const row = data as unknown as BookingDetailRow;

  const [nameByCustomerId, card] = await Promise.all([
    customerNamesByProfileId(row.customer_id ? [row.customer_id] : []),
    fetchSuccessfulPayment(row.id),
  ]);

  const customerName = resolveCustomerName(
    row.guest_first_name,
    row.guest_last_name,
    row.customer_id
      ? nameByCustomerId.get(row.customer_id) ?? "Unknown"
      : "Unknown"
  );

  return toDetail(row, customerName, card);
}

export async function checkInBooking(bookingId: string): Promise<CustomerBookingDetail> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, paymentStatus: true },
    });

    if (!booking) throw new BookingNotFoundError();

    if (booking.status !== "confirmed") {
      throw new InvalidBookingTransitionError("Only confirmed bookings can be checked in");
    }

    if (booking.paymentStatus !== "paid" && booking.paymentStatus !== "pay_at_hotel") {
      throw new InvalidBookingTransitionError("Booking payment must be paid or pay-at-hotel before check-in");
    }

    const assignedRooms = await tx.bookingRoom.findMany({
      where: { bookingId },
      select: { roomId: true },
    });
    const roomIds = assignedRooms.map((row) => row.roomId);

    if (roomIds.length === 0) {
      throw new InvalidBookingTransitionError("This booking has no assigned rooms");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "checked_in" },
    });

    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: CHECK_IN_ROOM_STATUS },
    });
  });

  const detail = await getCustomerBookingById(bookingId);
  if (!detail) throw new BookingNotFoundError();
  return detail;
}

export async function checkOutBooking(bookingId: string): Promise<CustomerBookingDetail> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) throw new BookingNotFoundError();

    if (booking.status !== "checked_in") {
      throw new InvalidBookingTransitionError("Only checked-in bookings can be checked out");
    }

    const assignedRooms = await tx.bookingRoom.findMany({
      where: { bookingId },
      select: { roomId: true },
    });
    const roomIds = assignedRooms.map((row) => row.roomId);

    if (roomIds.length === 0) {
      throw new InvalidBookingTransitionError("This booking has no assigned rooms");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "completed" },
    });

    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: CHECK_OUT_ROOM_STATUS },
    });
  });

  const detail = await getCustomerBookingById(bookingId);
  if (!detail) throw new BookingNotFoundError();
  return detail;
}
