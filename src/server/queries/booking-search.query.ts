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
// Unlike NON_BLOCKING_BOOKING_STATUSES (which is about room availability), a
// completed stay is real demand and should count toward popularity — only
// bookings that never actually happened are excluded here.
const POPULARITY_EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "refunded"]);

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

// "Most Popular" and "Recommended" both need this: how many rooms of each
// type have actually been booked (any date, not just the current search
// range) — a proxy for real demand.
async function fetchPopularityByRoomTypeId(roomRows: RoomRow[]): Promise<Map<string, number>> {
  const roomTypeIdByRoomId = new Map<string, string>();
  for (const room of roomRows) {
    if (room.room_type_id) roomTypeIdByRoomId.set(room.id, room.room_type_id);
  }

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, status");

  if (bookingsError) {
    console.error("[bookings] failed to fetch for popularity:", bookingsError);
    return new Map();
  }

  const countedBookingIds = ((bookings ?? []) as { id: string; status: string }[])
    .filter((booking) => !POPULARITY_EXCLUDED_STATUSES.has(booking.status.toLowerCase()))
    .map((booking) => booking.id);

  if (countedBookingIds.length === 0) return new Map();

  const { data: bookingRooms, error: bookingRoomsError } = await supabaseAdmin
    .from("booking_rooms")
    .select("booking_id, room_id")
    .in("booking_id", countedBookingIds);

  if (bookingRoomsError) {
    console.error("[booking_rooms] failed to fetch for popularity:", bookingRoomsError);
    return new Map();
  }

  const popularityByRoomTypeId = new Map<string, number>();
  for (const row of (bookingRooms ?? []) as BookingRoomRow[]) {
    const roomTypeId = roomTypeIdByRoomId.get(row.room_id);
    if (!roomTypeId) continue;
    popularityByRoomTypeId.set(roomTypeId, (popularityByRoomTypeId.get(roomTypeId) ?? 0) + 1);
  }
  return popularityByRoomTypeId;
}

// How deep the active promotion is, as a 0..1 fraction of the full price —
// 0 when there's no promotion. Used to give currently-discounted rooms a
// boost in the Recommended ranking.
function discountFraction(room: RoomSearchResult): number {
  if (room.fullPrice <= 0 || room.discountedPrice >= room.fullPrice) return 0;
  return (room.fullPrice - room.discountedPrice) / room.fullPrice;
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

  // A room type qualifies if its guests can be split across the requested
  // room count (e.g. 4 guests / 4 rooms can book a capacity-2 type as 2
  // rooms x 2 guests each) — not just if one room alone fits everyone.
  let results = ((typeRows ?? []) as unknown as RoomTypeRow[])
    .filter((row) => (row.capacity ?? 0) * query.rooms >= query.guests)
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
  } else {
    const popularityByRoomTypeId = await fetchPopularityByRoomTypeId((roomRows ?? []) as RoomRow[]);

    if (sort === "popular") {
      // Ranked purely by booking volume — cancelled/refunded bookings don't
      // count as demand (see POPULARITY_EXCLUDED_STATUSES).
      results.sort(
        (a, b) => (popularityByRoomTypeId.get(b.id) ?? 0) - (popularityByRoomTypeId.get(a.id) ?? 0),
      );
    } else {
      // Recommended: a blend of demand (60%) and how good a deal the room
      // currently is (40%, from its active promotion) — surfaces rooms that
      // are either proven popular or worth pushing right now.
      const maxPopularity = Math.max(1, ...results.map((room) => popularityByRoomTypeId.get(room.id) ?? 0));
      const recommendedScore = (room: RoomSearchResult) =>
        0.6 * ((popularityByRoomTypeId.get(room.id) ?? 0) / maxPopularity) + 0.4 * discountFraction(room);
      results.sort((a, b) => recommendedScore(b) - recommendedScore(a));
    }
  }

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

/** Public room information for the chatbot's Room Type quick actions. */
export async function getGuestRoomTypeByName(name: string): Promise<RoomSearchResult | null> {
  const roomName = name.trim();
  if (!roomName) return null;

  const { data, error } = await supabaseAdmin
    .from("room_types")
    .select(ROOM_TYPE_SELECT)
    .eq("name", roomName)
    .maybeSingle();

  if (error) {
    console.error("[room_types] failed to fetch by name:", error);
    return null;
  }

  return data ? mapRoomType(data as unknown as RoomTypeRow) : null;
}
