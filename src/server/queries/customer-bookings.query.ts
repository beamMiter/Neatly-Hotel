import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { CustomerBookingSummary, CustomerBookingDetail } from "@/types/customer-booking";

export const CUSTOMER_BOOKINGS_PAGE_SIZE = 10;

const BOOKING_SELECT =
  "id, booking_code, customer_id, check_in, check_out, guests, status, total_amount, created_at, booking_rooms(price_per_night, rooms(room_no, room_type, bed_type))";

type BookingRoomRow = {
  price_per_night: number | string;
  rooms: { room_no: string; room_type: string; bed_type: string } | null;
};

type BookingRow = {
  id: string;
  booking_code: string;
  customer_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total_amount: number | string;
  created_at: string;
  booking_rooms: BookingRoomRow[] | null;
};

// A booking can include several rooms (booking_rooms is a separate table).
// Rather than one list row per room, distinct room/bed types across a
// booking's rooms are collapsed into "first value +N more" so the table
// stays one row per booking, matching how the admin list is meant to read.
function summarizeDistinct(values: (string | null | undefined)[]): string {
  const distinct = Array.from(new Set(values.filter((value): value is string => Boolean(value))));
  if (distinct.length === 0) return "-";
  if (distinct.length === 1) return distinct[0];
  return `${distinct[0]} +${distinct.length - 1} more`;
}

// bookings.customer_id and profiles.id are sibling foreign keys into
// auth.users (not a direct FK to each other), so PostgREST can't embed
// profiles on a bookings select — fetched separately and stitched in here.
async function customerNamesByProfileId(customerIds: string[]): Promise<Map<string, string>> {
  if (customerIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", customerIds);

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
    // first_name/last_name are separate columns, so a query like "Test User"
    // won't substring-match either one on its own — each whitespace-split
    // word is required to match *some* name column (chained .or() calls are
    // AND'd together by PostgREST), so "Test" and "User" can each land in
    // either column.
    let profileQuery = supabase.from("profiles").select("id");
    for (const word of query.split(/\s+/).filter(Boolean)) {
      profileQuery = profileQuery.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%`);
    }
    const { data: matchedProfiles } = await profileQuery;
    const matchingCustomerIds = (matchedProfiles ?? []).map((profile) => profile.id as string);

    request =
      matchingCustomerIds.length > 0
        ? request.or(`booking_code.ilike.%${query}%,customer_id.in.(${matchingCustomerIds.join(",")})`)
        : request.ilike("booking_code", `%${query}%`);
  }

  const { data, count, error } = await request;

  if (error) {
    console.error("[bookings] failed to fetch bookings:", error);
    return { bookings: [], totalPages: 1 };
  }

  const rows = (data ?? []) as unknown as BookingRow[];
  const nameByCustomerId = await customerNamesByProfileId(rows.map((row) => row.customer_id));

  const bookings = rows.map((row) => toSummary(row, nameByCustomerId.get(row.customer_id) ?? "Unknown"));
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
  const nameByCustomerId = await customerNamesByProfileId([row.customer_id]);
  const rooms = row.booking_rooms ?? [];

  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerName: nameByCustomerId.get(row.customer_id) ?? "Unknown",
    guests: row.guests,
    roomType: summarizeDistinct(rooms.map((room) => room.rooms?.room_type)),
    amount: rooms.length,
    bedType: summarizeDistinct(rooms.map((room) => room.rooms?.bed_type)),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: differenceInCalendarDays(new Date(row.check_out), new Date(row.check_in)),
    bookingDate: row.created_at,
    totalAmount: Number(row.total_amount),
  };
}
