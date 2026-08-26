import type { Metadata } from "next";
import { SearchPageView } from "@/features/booking/components/SearchPageView";
import { searchRoomTypes } from "@/server/queries/booking-search.query";
import { validateStayDates } from "@/features/booking/date-rules";
import {
  SEARCH_PRICE_MAX,
  SEARCH_PRICE_MIN,
  isSearchSort,
  type SearchQuery,
  type SearchSort,
} from "@/types/room-search";

export const metadata: Metadata = {
  title: "Search Rooms | Neatly Hotel",
  description: "Search available rooms at Neatly Hotel",
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function bangkokIsoDate(offsetDays = 0): string {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bangkokNow.setDate(bangkokNow.getDate() + offsetDays);
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCount(value: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parsePrice(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(SEARCH_PRICE_MAX, Math.max(SEARCH_PRICE_MIN, parsed));
}

function parseSort(value: string): SearchSort {
  return isSearchSort(value) ? value : "recommended";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  let minPrice = parsePrice(first(params.minPrice), SEARCH_PRICE_MIN);
  let maxPrice = parsePrice(first(params.maxPrice), SEARCH_PRICE_MAX);
  if (minPrice > maxPrice) {
    const swapped = minPrice;
    minPrice = maxPrice;
    maxPrice = swapped;
  }

  const checkIn = first(params.checkIn) || bangkokIsoDate(0);
  const checkOut = first(params.checkOut) || bangkokIsoDate(1);
  const hasInvalidDates = validateStayDates(checkIn, checkOut) !== null;

  const initialQuery: SearchQuery = {
    checkIn: hasInvalidDates ? bangkokIsoDate(0) : checkIn,
    checkOut: hasInvalidDates ? bangkokIsoDate(1) : checkOut,
    rooms: parseCount(first(params.rooms), 1, 3),
    guests: parseCount(first(params.guests), 2, 8),
    minPrice,
    maxPrice,
    sort: parseSort(first(params.sort)),
  };

  const rooms = await searchRoomTypes(initialQuery);

  return <SearchPageView rooms={rooms} initialQuery={initialQuery} />;
}
