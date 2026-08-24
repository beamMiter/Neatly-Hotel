"use client";

import { useEffect } from "react";
import BookingSearch from "@/components/shared/BookingSearch";
import { RoomCard } from "@/features/booking/components/RoomCard";
import type { RoomSearchResult, SearchQuery } from "@/types/room-search";

type SearchPageViewProps = {
  rooms: RoomSearchResult[];
  initialQuery: SearchQuery;
};

export function SearchPageView({ rooms, initialQuery }: SearchPageViewProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [initialQuery.checkIn, initialQuery.checkOut, initialQuery.rooms, initialQuery.guests]);

  return (
    <main className="flex-1 animate-[fade-slide_400ms_ease-out] bg-brand-surface">
      <div className="sticky top-0 z-30 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
          <BookingSearch compact initialQuery={initialQuery} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        {rooms.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-muted">
            No rooms match this search. Try different dates, rooms, or guests.
          </p>
        ) : (
          rooms.map((room) => <RoomCard key={room.id} room={room} searchQuery={initialQuery} />)
        )}
      </div>
    </main>
  );
}
