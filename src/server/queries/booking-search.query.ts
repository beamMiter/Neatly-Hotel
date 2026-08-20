import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import {
  SEARCH_PRICE_MAX,
  SEARCH_PRICE_MIN,
  type RoomSearchResult,
  type SearchQuery,
} from "@/types/room-search";

const IMAGE_BUCKET = "room-images";

const UNAVAILABLE_STATUSES = new Set(["Out of Order", "Out of Service", "Out of Inventory"]);
const NON_BLOCKING_BOOKING_STATUSES = new Set(["cancelled", "canceled", "completed", "refunded"]);

type RoomTypeRow = {
  id: string;
  name: string;
  description: string | null;
  bed_type: string | null;
  capacity: number | null;
  size_sqm: number | string | null;
  base_price: number | string | null;
  promotion_price: number | string | null;
  amenities: string[] | null;
  room_images:
    | {
        storage_path: string;
        is_cover: boolean;
        sort_order: number | null;
      }[]
    | null;
};

type RoomRow = {
  id: string;
  room_type_id: string | null;
  status: string;
};

type BookingRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  expires_at: string | null;
};

type BookingRoomRow = {
  booking_id: string;
  room_id: string;
};

const ROOM_TYPE_SELECT =
  "id, name, description, bed_type, capacity, size_sqm, base_price, promotion_price, amenities, room_images(storage_path, is_cover, sort_order)";

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function imageUrlsFrom(images: RoomTypeRow["room_images"]): string[] {
  if (!images || images.length === 0) return [];

  return [...images]
    .sort((a, b) => {
      if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map(
      (image) =>
        supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(image.storage_path).data.publicUrl,
    );
}

function mapRoomType(row: RoomTypeRow): RoomSearchResult {
  const fullPrice = toNumber(row.base_price);
  const promo = row.promotion_price === null ? null : toNumber(row.promotion_price);
  const imageUrls = imageUrlsFrom(row.room_images);

  return {
    id: row.id,
    name: row.name,
    guests: row.capacity ?? 0,
    bedType: row.bed_type ?? "",
    sizeSqm: toNumber(row.size_sqm),
    fullPrice,
    discountedPrice: promo ?? fullPrice,
    description: row.description ?? "",
    amenities: row.amenities ?? [],
    imageUrls,
  };
}

function datesOverlap(checkIn: string, checkOut: string, bookingIn: string, bookingOut: string) {
  return bookingIn < checkOut && bookingOut > checkIn;
}

// A booking blocks a room only while it's neither cancelled/completed nor
// an expired, still-unpaid hold — see the payment hold lifecycle in
// bookings.query.ts (30-minute expires_at) and the plan's status table.
function isBlockingBooking(booking: BookingRow): boolean {
  if (NON_BLOCKING_BOOKING_STATUSES.has(booking.status.toLowerCase())) return false;
  if (booking.expires_at && new Date(booking.expires_at) <= new Date()) return false;
  return true;
}

async function getBookedRoomIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, check_in, check_out, status, expires_at");

  if (bookingsError) {
    console.error("[bookings] failed to fetch for search:", bookingsError);
    return new Set();
  }

  const overlappingIds = ((bookings ?? []) as BookingRow[])
    .filter(isBlockingBooking)
    .filter((booking) => datesOverlap(checkIn, checkOut, booking.check_in, booking.check_out))
    .map((booking) => booking.id);

  if (overlappingIds.length === 0) return new Set();

  const { data: bookingRooms, error: bookingRoomsError } = await supabaseAdmin
    .from("booking_rooms")
    .select("booking_id, room_id")
    .in("booking_id", overlappingIds);

  if (bookingRoomsError) {
    console.error("[booking_rooms] failed to fetch for search:", bookingRoomsError);
    return new Set();
  }

  return new Set(((bookingRooms ?? []) as BookingRoomRow[]).map((row) => row.room_id));
}

function isAvailableRoom(room: RoomRow, bookedRoomIds: Set<string> | null) {
  if (UNAVAILABLE_STATUSES.has(room.status)) return false;
  if (bookedRoomIds && bookedRoomIds.has(room.id)) return false;
  return true;
}

export async function searchRoomTypes(query: SearchQuery): Promise<RoomSearchResult[]> {
  const [{ data: typeRows, error: typesError }, { data: roomRows, error: roomsError }] =
    await Promise.all([
      supabaseAdmin.from("room_types").select(ROOM_TYPE_SELECT).order("created_at", { ascending: true }),
      supabaseAdmin.from("rooms").select("id, room_type_id, status"),
    ]);

  if (typesError) {
    console.error("[room_types] failed to fetch for search:", typesError);
    return [];
  }

  if (roomsError) {
    console.error("[rooms] failed to fetch for search:", roomsError);
    return [];
  }

  const hasDates = Boolean(query.checkIn && query.checkOut);
  const bookedRoomIds = hasDates ? await getBookedRoomIds(query.checkIn, query.checkOut) : null;

  const availableByType = new Map<string, number>();
  for (const room of (roomRows ?? []) as RoomRow[]) {
    if (!room.room_type_id) continue;
    if (!isAvailableRoom(room, bookedRoomIds)) continue;
    availableByType.set(room.room_type_id, (availableByType.get(room.room_type_id) ?? 0) + 1);
  }

  let results = ((typeRows ?? []) as unknown as RoomTypeRow[])
    .filter((row) => (row.capacity ?? 0) >= query.guests)
    .filter((row) => (availableByType.get(row.id) ?? 0) >= query.rooms)
    .map(mapRoomType);

  if (query.minPrice != null || query.maxPrice != null) {
    const minPrice = query.minPrice ?? SEARCH_PRICE_MIN;
    const maxPrice = query.maxPrice ?? SEARCH_PRICE_MAX;
    results = results.filter(
      (room) => room.discountedPrice >= minPrice && room.discountedPrice <= maxPrice,
    );
  }

  const sort = query.sort ?? "recommended";
  if (sort === "price-asc") {
    results.sort((a, b) => a.discountedPrice - b.discountedPrice);
  } else if (sort === "price-desc") {
    results.sort((a, b) => b.discountedPrice - a.discountedPrice);
  }
  // recommended + popular: keep room_types.created_at ASC (no popularity metric yet)

  return results;
}

export async function getGuestRoomTypeById(id: string): Promise<RoomSearchResult | null> {
  const { data, error } = await supabaseAdmin
    .from("room_types")
    .select(ROOM_TYPE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[room_types] failed to fetch by id:", error);
    return null;
  }

  if (!data) return null;
  return mapRoomType(data as unknown as RoomTypeRow);
}
