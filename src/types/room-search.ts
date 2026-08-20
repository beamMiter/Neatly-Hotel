// Named RoomSearchResult (not RoomType) so this doesn't collide with the
// admin/sellable-room-type shape in @/types/room-type or the physical-room
// shape in @/types/rooms — same word, three different domain concepts.

export type RoomSearchResult = {
  id: string;
  name: string;
  guests: number;
  bedType: string;
  sizeSqm: number;
  fullPrice: number;
  discountedPrice: number;
  description: string;
  amenities: string[];
  imageUrls: string[];
};

export type SearchQuery = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
};

export type RoomTypeAvailability = {
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  roomsRequested: number;
  availableCount: number;
  canBook: boolean;
  reasons: string[];
};
