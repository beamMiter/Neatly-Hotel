"use client";

import { useEffect } from "react";
import BookingSearch from "@/components/shared/BookingSearch";
import { RoomCard } from "@/features/booking/components/RoomCard";
import { SearchFilterDropdown } from "@/features/booking/components/SearchFilterDropdown";
import type { RoomSearchResult, SearchQuery } from "@/types/room-search";

type SearchPageViewProps = {
  rooms: RoomSearchResult[];
  initialQuery: SearchQuery;
  isLoggedIn: boolean;
};

export function SearchPageView({ rooms, initialQuery, isLoggedIn }: SearchPageViewProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialQuery.checkIn,
    initialQuery.checkOut,
    initialQuery.rooms,
    initialQuery.guests,
    initialQuery.minPrice,
    initialQuery.maxPrice,
    initialQuery.sort,
  ]);

  return (
    <main className="flex-1 animate-[fade-slide_400ms_ease-out] bg-brand-surface">
      <div className="sticky top-0 z-30 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
          <BookingSearch
            compact
            initialQuery={initialQuery}
            extraControl={<SearchFilterDropdown query={initialQuery} />}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        {rooms.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-muted">
            No rooms match this search. Try different dates, rooms, guests, or filters.
          </p>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} searchQuery={initialQuery} isLoggedIn={isLoggedIn} />
          ))
        )}
      </div>
    </main>
  );
}
