import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { BookingHistoryItem, BookingHistoryStatus, BookingLineItem, BookingPayment } from "@/types/booking";

const IMAGE_BUCKET = "room-images";

const BOOKING_SELECT =
  "id, booking_code, check_in, check_out, guests, status, total_amount, created_at, cancelled_at, additional_request, promo_code, discount_amount, special_requests, payment_method, booking_rooms(price_per_night, rooms(room_type_id, room_types(name, room_images(storage_path, is_cover, sort_order))))";

type RoomImageRow = { storage_path: string; is_cover: boolean; sort_order: number | null };

type BookingRoomRow = {
  price_per_night: number | string;
  rooms: {
    room_type_id: string | null;
    room_types: { name: string; room_images: RoomImageRow[] | null } | null;
  } | null;
};

// Same shape as SelectedSpecialRequest (src/types/booking.ts), but
// `quantity` is optional on the way in — bookings made before add-ons
// became countable stored no `quantity`. Defaulted to 1 below, same as
// bookings.query.ts's toBookingRecord does.
type SelectedSpecialRequestRow = { code: string; label: string; price: number; quantity?: number };

type BookingRow = {
  id: string;
  booking_code: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total_amount: number | string;
  created_at: string;
  cancelled_at: string | null;
  additional_request: string | null;
  promo_code: string | null;
  discount_amount: number | string;
  special_requests: SelectedSpecialRequestRow[] | null;
  payment_method: string;
  booking_rooms: BookingRoomRow[] | null;
};

function asPaymentMethod(value: string): BookingPayment["method"] {
  if (value === "cash" || value === "promptpay") return value;
  return "credit_card";
}

// bookings.status is the richer BookingStatus from src/types/booking.ts
// (pending_payment | confirmed | checked_in | completed | cancelled) — this
// page's BookingHistoryStatus only distinguishes upcoming/checked_in/cancelled,
// so pending_payment/confirmed/completed all collapse to "upcoming" for now.
function asHistoryStatus(status: string): BookingHistoryStatus {
  if (status === "checked_in") return "checked_in";
  // "refunded" is a cancellation outcome (see cancelBooking in
  // bookings.query.ts), not a separate lifecycle state — without this it
  // fell through to "upcoming" and a refunded booking looked unaffected.
  if (status === "cancelled" || status === "refunded") return "cancelled";
  return "upcoming";
}

function coverImageUrl(images: RoomImageRow[] | null | undefined): string {
  if (!images || images.length === 0) return "";
  const cover = images.find((image) => image.is_cover) ?? images[0];
  return supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(cover.storage_path).data.publicUrl;
}

// Latest succeeded payment's last4 per booking, batched in one query rather
// than one round-trip per booking row.
async function fetchLastDigitsByBookingId(bookingIds: string[]): Promise<Map<string, string>> {
  if (bookingIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("booking_id, card_last4, updated_at")
    .in("booking_id", bookingIds)
    .eq("status", "succeeded")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("[payments] failed to fetch card details:", error);
    return new Map();
  }

  const lastDigitsByBookingId = new Map<string, string>();
  for (const row of data as { booking_id: string; card_last4: string | null }[]) {
    if (row.card_last4 && !lastDigitsByBookingId.has(row.booking_id)) {
      lastDigitsByBookingId.set(row.booking_id, row.card_last4);
    }
  }
  return lastDigitsByBookingId;
}

// TODO(booking-history): this mapping is a placeholder pending reconciliation
// with the real BookingRecord shape (src/types/booking.ts, sourced by
// bookings.query.ts) — checkedInAt isn't sourced from a real column yet
// (bookings.checked_in_at exists but nothing populates it for a customer's
// own reservation stay), so it's left null here rather than fabricated.
// getBookingActions (src/lib/booking-actions.ts) branches on checkedInAt,
// not on status, so that branch won't behave correctly for a real
// checked-in booking until this is revisited.
function toBookingHistoryItem(row: BookingRow, lastDigits: string): BookingHistoryItem {
  const bookingRooms = row.booking_rooms ?? [];
  const firstRoom = bookingRooms[0]?.rooms ?? null;
  const roomType = firstRoom?.room_types ?? null;
  const nights = differenceInCalendarDays(new Date(row.check_out), new Date(row.check_in));

  const roomSubtotal =
    bookingRooms.reduce((sum, bookingRoom) => sum + Number(bookingRoom.price_per_night), 0) * nights;

  const lineItems: BookingLineItem[] = [
    { label: roomType?.name ?? "Room", amount: roomSubtotal },
    ...(row.special_requests ?? []).map((item) => ({
      label: item.label,
      amount: item.price * (item.quantity ?? 1),
    })),
  ];

  const discountAmount = Number(row.discount_amount);
  if (row.promo_code && discountAmount > 0) {
    lineItems.push({ label: "Promotion Code", amount: -discountAmount });
  }

  return {
    id: row.id,
    bookingCode: row.booking_code,
    status: asHistoryStatus(row.status),
    roomTypeId: firstRoom?.room_type_id ?? "",
    roomTypeName: roomType?.name ?? "Room",
    imageUrl: coverImageUrl(roomType?.room_images),
    guests: row.guests,
    nights,
    bookingCreatedAt: row.created_at,
    checkInDate: row.check_in,
    checkOutDate: row.check_out,
    checkedInAt: null,
    cancelledAt: row.cancelled_at,
    payment: { method: asPaymentMethod(row.payment_method), lastDigits },
    lineItems,
    totalAmount: Number(row.total_amount),
    additionalRequest: row.additional_request,
  };
}

export async function getBookingsForCustomer(customerId: string): Promise<BookingHistoryItem[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[bookings] failed to fetch booking history:", error);
    return [];
  }

  const rows = data as unknown as BookingRow[];
  const lastDigitsByBookingId = await fetchLastDigitsByBookingId(rows.map((row) => row.id));

  return rows.map((row) => toBookingHistoryItem(row, lastDigitsByBookingId.get(row.id) ?? ""));
}
