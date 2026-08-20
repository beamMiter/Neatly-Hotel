export type RoomType = {
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
