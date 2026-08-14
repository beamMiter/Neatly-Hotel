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
