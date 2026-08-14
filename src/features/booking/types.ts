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
  imageCount: number;
};

export type SearchQuery = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
};
