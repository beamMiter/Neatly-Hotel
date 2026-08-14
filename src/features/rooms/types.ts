// Reuse the same bed type list as Room Management for consistency.
export { BED_TYPES, type BedType } from "@/types/rooms";

export type Room = {
  id: string;
  roomType: string;
  price: number;
  promotionPrice: number | null;
  guests: number;
  bedType: string;
  roomSizeSqm: number;
  imageUrl: string | null;
};
