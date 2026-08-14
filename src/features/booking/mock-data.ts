import type { RoomType } from "@/features/booking/types";

const SHARED_AMENITIES = [
  "Safe in Room",
  "Air Conditioning",
  "High speed internet connection",
  "Hairdryer",
  "Shower",
  "Bathroom amenities",
  "Lamp",
  "Minibar",
  "Telephone",
  "Ironing board",
  "A floor only accessible via a guest room key",
  "Alarm clock",
  "Bathrobe",
];

export const MOCK_ROOM_TYPES: RoomType[] = [
  {
    id: "superior-garden-view",
    name: "Superior Garden View",
    guests: 2,
    bedType: "1 Double bed",
    sizeSqm: 32,
    fullPrice: 3100,
    discountedPrice: 2500,
    description:
      "Rooms (36sqm) with full garden views, 1 single bed, bathroom with bathtub & shower.",
    amenities: SHARED_AMENITIES,
    imageCount: 4,
  },
  {
    id: "deluxe",
    name: "Deluxe",
    guests: 2,
    bedType: "1 Double bed",
    sizeSqm: 32,
    fullPrice: 3100,
    discountedPrice: 2500,
    description:
      "Rooms (36sqm) with full garden views, 1 single bed, bathroom with bathtub & shower.",
    amenities: SHARED_AMENITIES,
    imageCount: 3,
  },
  {
    id: "superior",
    name: "Superior",
    guests: 2,
    bedType: "1 Double bed",
    sizeSqm: 32,
    fullPrice: 3100,
    discountedPrice: 2500,
    description:
      "Rooms (36sqm) with full garden views, 1 single bed, bathroom with bathtub & shower.",
    amenities: SHARED_AMENITIES,
    imageCount: 3,
  },
  {
    id: "supreme",
    name: "Supreme",
    guests: 2,
    bedType: "1 Double bed",
    sizeSqm: 32,
    fullPrice: 3100,
    discountedPrice: 2500,
    description:
      "Rooms (36sqm) with full garden views, 1 single bed, bathroom with bathtub & shower.",
    amenities: SHARED_AMENITIES,
    imageCount: 4,
  },
];

export function getRoomTypeById(id: string): RoomType | undefined {
  return MOCK_ROOM_TYPES.find((room) => room.id === id);
}

export function formatThb(amount: number): string {
  return `THB ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
