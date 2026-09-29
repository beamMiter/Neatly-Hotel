// Reuse the same bed type list as Room Management for consistency.
export { BED_TYPES, type BedType } from "@/types/rooms";

// Named RoomTypeSummary/RoomTypeDetail (not Room/RoomDetail) so this doesn't
// collide with the physical-room Room in @/types/rooms or the search-result
// shape in @/types/room-search — same word, three different domain concepts.

export type RoomTypeSummary = {
  id: string;
  roomType: string;
  price: number;
  promotionPrice: number | null;
  guests: number;
  bedType: string;
  roomSizeSqm: number;
  imageUrl: string | null;
};

export type RoomImage = {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
};

export type RoomTypeDetail = {
  id: string;
  roomType: string;
  description: string;
  price: number;
  promotionPrice: number | null;
  guests: number;
  bedType: string;
  roomSizeSqm: number;
  amenities: string[];
  mainImage: RoomImage | null;
  gallery: RoomImage[];
};
