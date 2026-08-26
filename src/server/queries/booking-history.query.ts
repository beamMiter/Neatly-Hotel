import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { BookingHistoryItem, BookingHistoryStatus } from "@/types/booking";

const BOOKING_SELECT =
  "id, booking_code, check_in, check_out, guests, status, total_amount, created_at, additional_request, booking_rooms(rooms(room_type_id, room_types(name)))";

type BookingRoomRow = {
  rooms: { room_type_id: string | null; room_types: { name: string } | null } | null;
};

type BookingRow = {
  id: string;
  booking_code: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total_amount: number | string;
  created_at: string;
  additional_request: string | null;
  booking_rooms: BookingRoomRow[] | null;
};

// bookings.status is the richer BookingStatus from src/types/booking.ts
// (pending_payment | confirmed | checked_in | completed | cancelled) — this
// page's BookingHistoryStatus only distinguishes upcoming/checked_in/cancelled,
// so pending_payment/confirmed/completed all collapse to "upcoming" for now.
function asHistoryStatus(status: string): BookingHistoryStatus {
  if (status === "checked_in") return "checked_in";
  if (status === "cancelled") return "cancelled";
  return "upcoming";
}

// TODO(booking-history): this mapping is a placeholder pending reconciliation
// with the real BookingRecord shape (src/types/booking.ts, sourced by
// bookings.query.ts) — payment card details, an itemized line-item
// breakdown, and separate checked-in/cancelled timestamps aren't sourced
// from real columns yet, so those fields are left empty/null here rather
// than fabricated. getBookingActions (src/lib/booking-actions.ts) branches
// on checkedInAt/cancelledAt, not on status, so those branches won't behave
// correctly for real checked-in/cancelled bookings until this is revisited.
function toBookingHistoryItem(row: BookingRow): BookingHistoryItem {
  const firstRoom = row.booking_rooms?.[0]?.rooms ?? null;

  return {
    id: row.id,
    bookingCode: row.booking_code,
    status: asHistoryStatus(row.status),
    roomTypeId: firstRoom?.room_type_id ?? "",
    roomTypeName: firstRoom?.room_types?.name ?? "Room",
    imageUrl: "",
    guests: row.guests,
    nights: differenceInCalendarDays(new Date(row.check_out), new Date(row.check_in)),
    bookingCreatedAt: row.created_at,
    checkInDate: row.check_in,
    checkOutDate: row.check_out,
    checkedInAt: null,
    cancelledAt: null,
    payment: { method: "credit_card", lastDigits: "" },
    lineItems: [],
    totalAmount: Number(row.total_amount),
    additionalRequest: row.additional_request,
  };
}

export async function getBookingsForCustomer(customerId: string): Promise<BookingHistoryItem[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("customer_id", customerId)
    .order("check_in", { ascending: false });

  if (error || !data) {
    console.error("[bookings] failed to fetch booking history:", error);
    return [];
  }

  return (data as unknown as BookingRow[]).map(toBookingHistoryItem);
}
