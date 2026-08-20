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

export const SEARCH_PRICE_MIN = 1000;
export const SEARCH_PRICE_MAX = 10000;

export type SearchSort = "recommended" | "price-asc" | "price-desc" | "popular";

export type SearchQuery = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: SearchSort;
};

export function isSearchSort(value: string): value is SearchSort {
  return (
    value === "recommended" ||
    value === "price-asc" ||
    value === "price-desc" ||
    value === "popular"
  );
}

export function isPriceFilterApplied(minPrice?: number, maxPrice?: number): boolean {
  return (
    (minPrice ?? SEARCH_PRICE_MIN) !== SEARCH_PRICE_MIN ||
    (maxPrice ?? SEARCH_PRICE_MAX) !== SEARCH_PRICE_MAX
  );
}

export function appendSearchFilterParams(
  params: URLSearchParams,
  query: Pick<SearchQuery, "minPrice" | "maxPrice" | "sort">,
) {
  const minPrice = query.minPrice ?? SEARCH_PRICE_MIN;
  const maxPrice = query.maxPrice ?? SEARCH_PRICE_MAX;
  if (minPrice !== SEARCH_PRICE_MIN) params.set("minPrice", String(minPrice));
  if (maxPrice !== SEARCH_PRICE_MAX) params.set("maxPrice", String(maxPrice));
  if (query.sort && query.sort !== "recommended") params.set("sort", query.sort);
  return params;
}

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
