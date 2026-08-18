export function formatThb(amount: number): string {
  return `THB ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const FALLBACK_GALLERY = ["/images/room-bg-preview/room-preview-auto1.jpg"];

export function toLandingRoom(room: {
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
}) {
  return {
    slug: room.id,
    name: room.name,
    description: room.description,
    guests: room.guests,
    bed: room.bedType,
    sqm: room.sizeSqm,
    oldPrice: room.fullPrice,
    price: room.discountedPrice,
    gallery: room.imageUrls.length > 0 ? room.imageUrls : FALLBACK_GALLERY,
    amenities: room.amenities,
  };
}

