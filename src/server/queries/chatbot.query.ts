import "server-only";
import { getGuestRoomTypeByName, searchRoomTypes } from "@/server/queries/booking-search.query";
import type { RoomSearchResult } from "@/types/room-search";
import type { ChatbotRoomResult, ChatbotSearchState } from "@/types/chatbot";

export const emptyChatbotSearchState: ChatbotSearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
};

function toChatbotRoomResult(room: RoomSearchResult): ChatbotRoomResult {
  return {
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
  };
}

export async function getChatbotRoomInformation(roomName: string): Promise<ChatbotRoomResult | null> {
  const room = await getGuestRoomTypeByName(roomName);
  return room ? toChatbotRoomResult(room) : null;
}

export async function searchAvailableChatbotRooms(search: ChatbotSearchState): Promise<ChatbotRoomResult[]> {
  const { checkIn, checkOut, guests, budget } = search;
  if (!checkIn || !checkOut || !guests || !budget) return [];

  const roomTypes = await searchRoomTypes({
    checkIn,
    checkOut,
    rooms: 1,
    guests,
  });

  return roomTypes
    .filter((room) => room.discountedPrice <= budget)
    .slice(0, 6)
    .map(toChatbotRoomResult);
}

export function getMissingChatbotSearchFields(search: ChatbotSearchState) {
  const missing: Array<keyof ChatbotSearchState> = [];
  if (!search.checkIn) missing.push("checkIn");
  if (!search.checkOut) missing.push("checkOut");
  if (!search.guests) missing.push("guests");
  if (!search.budget) missing.push("budget");
  return missing;
}

export function mergeChatbotSearchState(
  current: ChatbotSearchState,
  extracted: Partial<ChatbotSearchState>,
): ChatbotSearchState {
  return {
    checkIn: extracted.checkIn ?? current.checkIn,
    checkOut: extracted.checkOut ?? current.checkOut,
    guests: extracted.guests ?? current.guests,
    budget: extracted.budget ?? current.budget,
  };
}

export function isValidChatbotDateRange(search: ChatbotSearchState) {
  if (!search.checkIn || !search.checkOut) return true;
  const checkIn = Date.parse(`${search.checkIn}T00:00:00`);
  const checkOut = Date.parse(`${search.checkOut}T00:00:00`);
  return Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkOut > checkIn;
}
