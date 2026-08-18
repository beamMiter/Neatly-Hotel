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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const initialQuery: SearchQuery = {
    checkIn: first(params.checkIn) || bangkokIsoDate(0),
    checkOut: first(params.checkOut) || bangkokIsoDate(1),
    rooms: parseCount(first(params.rooms), 1, 3),
    guests: parseCount(first(params.guests), 2, 8),
  };

  const rooms = await searchRoomTypes(initialQuery);

  return <SearchPageView rooms={rooms} initialQuery={initialQuery} />;
}
