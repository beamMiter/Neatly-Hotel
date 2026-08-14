"use client";

import { useRef, useState, type UIEvent } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { RoomCard } from "@/features/booking/components/RoomCard";
import { SearchBar } from "@/features/booking/components/SearchBar";
import type { RoomType, SearchQuery } from "@/features/booking/types";

type SearchPageViewProps = {
  rooms: RoomType[];
  initialQuery: SearchQuery;
};

export function SearchPageView({ rooms, initialQuery }: SearchPageViewProps) {
  const [isSearchHidden, setIsSearchHidden] = useState(false);
  const lastScrollTop = useRef(0);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const current = event.currentTarget.scrollTop;
    const delta = current - lastScrollTop.current;

    if (current <= 8) {
      setIsSearchHidden(false);
    } else if (delta > 6) {
      setIsSearchHidden(true);
    } else if (delta < -6) {
      setIsSearchHidden(false);
    }

    lastScrollTop.current = current;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-brand-surface">
      <Navbar />
      <SearchBar initialQuery={initialQuery} hidden={isSearchHidden} />

      <div className="min-h-0 flex-1 overflow-y-auto" onScroll={handleScroll}>
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>
    </div>
  );
}
