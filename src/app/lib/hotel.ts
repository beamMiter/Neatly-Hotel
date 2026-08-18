import "server-only";
import { searchRoomTypes } from "@/features/booking/queries";

export type SearchState = {
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};

export type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  size: string;
  bed: string;
  available: boolean;
  imageUrl: string | null;
  amenities: string[];
  detailHref: string;
};

export const emptySearchState: SearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
};

export async function searchAvailableRooms(search: SearchState): Promise<Room[]> {
  if (!search.checkIn || !search.checkOut || !search.guests || !search.budget) return [];

  const roomTypes = await searchRoomTypes({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    rooms: 1,
    guests: search.guests,
  });

  return roomTypes
    .filter((room) => room.discountedPrice <= search.budget!)
    .slice(0, 6)
    .map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      capacity: room.guests,
      price: room.discountedPrice,
      size: `${room.sizeSqm} sqm`,
      bed: room.bedType,
      available: true,
      imageUrl: room.imageUrls[0] ?? null,
      amenities: room.amenities,
      detailHref: `/rooms/${room.id}`,
    }));
}

export function getMissingSearchFields(search: SearchState) {
  const missing: Array<keyof SearchState> = [];
  if (!search.checkIn) missing.push("checkIn");
  if (!search.checkOut) missing.push("checkOut");
  if (!search.guests) missing.push("guests");
  if (!search.budget) missing.push("budget");
  return missing;
}

export function mergeSearchState(
  current: SearchState,
  extracted: Partial<SearchState>,
): SearchState {
  return {
    checkIn: extracted.checkIn ?? current.checkIn,
    checkOut: extracted.checkOut ?? current.checkOut,
    guests: extracted.guests ?? current.guests,
    budget: extracted.budget ?? current.budget,
  };
}

export function isValidDateRange(search: SearchState) {
  if (!search.checkIn || !search.checkOut) return true;
  const checkIn = Date.parse(`${search.checkIn}T00:00:00`);
  const checkOut = Date.parse(`${search.checkOut}T00:00:00`);
  return Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkOut > checkIn;
}
