import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/server/db";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { BookingPaymentStatus, BookingStatus } from "@/types/booking";
import type { CustomerBookingSummary, CustomerBookingDetail } from "@/types/customer-booking";

export const CUSTOMER_BOOKINGS_PAGE_SIZE = 10;

const BOOKING_SELECT =
  "id, booking_code, customer_id, check_in, check_out, guests, status, payment_status, total_amount, created_at, guest_first_name, guest_last_name, guest_email, booking_rooms(price_per_night, rooms(room_no, room_type, bed_type))";

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
    value === "cancelled"
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

function resolveCustomerName(row: BookingRow, nameByCustomerId: Map<string, string>): string {
  if (row.customer_id) {
    const fromProfile = nameByCustomerId.get(row.customer_id);
    if (fromProfile) return fromProfile;
  }

  const fromGuest = `${row.guest_first_name ?? ""} ${row.guest_last_name ?? ""}`.trim();
  return fromGuest || "Guest";
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

function toDetail(row: BookingRow, customerName: string): CustomerBookingDetail {
  const rooms = row.booking_rooms ?? [];
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
    nights: differenceInCalendarDays(new Date(row.check_out), new Date(row.check_in)),
    bookingDate: row.created_at,
    totalAmount: Number(row.total_amount),
    status: asBookingStatus(row.status),
    paymentStatus: asPaymentStatus(row.payment_status),
    roomNos: rooms.map((room) => room.rooms?.room_no).filter((value): value is string => Boolean(value)),
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
    .order("created_at", { ascending: false })
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

  const bookings = rows.map((row) => toSummary(row, resolveCustomerName(row, nameByCustomerId)));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / CUSTOMER_BOOKINGS_PAGE_SIZE));

  return { bookings, totalPages };
}

export async function getCustomerBookingById(id: string): Promise<CustomerBookingDetail | null> {
  const { data, error } = await supabaseAdmin.from("bookings").select(BOOKING_SELECT).eq("id", id).single();

  if (error || !data) {
    console.error("[bookings] failed to fetch booking detail:", error);
    return null;
  }

  const row = data as unknown as BookingRow;
  const nameByCustomerId = await customerNamesByProfileId(row.customer_id ? [row.customer_id] : []);
  return toDetail(row, resolveCustomerName(row, nameByCustomerId));
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
