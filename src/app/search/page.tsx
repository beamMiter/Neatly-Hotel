import type { Metadata } from "next";
import { SearchPageView } from "@/features/booking/components/SearchPageView";
import { searchRoomTypes } from "@/features/booking/queries";
import type { SearchQuery } from "@/features/booking/types";

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

function parseCount(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 10);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const initialQuery: SearchQuery = {
    checkIn: first(params.checkIn),
    checkOut: first(params.checkOut),
    rooms: parseCount(first(params.rooms), 1),
    guests: parseCount(first(params.guests), 2),
  };

  const rooms = await searchRoomTypes(initialQuery);

  return <SearchPageView rooms={rooms} initialQuery={initialQuery} />;
}
