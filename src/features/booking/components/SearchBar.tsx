"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, format, isAfter, parseISO, startOfDay } from "date-fns";
import { DateField } from "@/features/booking/components/DateField";
import { RoomsGuestsDropdown } from "@/features/booking/components/RoomsGuestsDropdown";
import type { SearchQuery } from "@/features/booking/types";

type SearchBarProps = {
  initialQuery: SearchQuery;
  hidden?: boolean;
};

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function SearchBar({ initialQuery, hidden = false }: SearchBarProps) {
  const router = useRouter();
  const today = startOfDay(new Date());

  const [checkIn, setCheckIn] = useState<Date | undefined>(() => parseDate(initialQuery.checkIn));
  const [checkOut, setCheckOut] = useState<Date | undefined>(() => parseDate(initialQuery.checkOut));
  const [rooms, setRooms] = useState(initialQuery.rooms);
  const [guests, setGuests] = useState(initialQuery.guests);

  function handleCheckInChange(date: Date | undefined) {
    setCheckIn(date);
    if (date && checkOut && !isAfter(checkOut, date)) {
      setCheckOut(undefined);
    }
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", format(checkIn, "yyyy-MM-dd"));
    if (checkOut) params.set("checkOut", format(checkOut, "yyyy-MM-dd"));
    params.set("rooms", String(rooms));
    params.set("guests", String(guests));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      className={`shrink-0 border-b border-brand-border bg-white transition-[max-height,opacity] duration-300 ${
        hidden ? "max-h-0 overflow-hidden opacity-0 pointer-events-none" : "max-h-48 overflow-visible opacity-100"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:items-end lg:gap-6">
        <div className="flex min-w-0 flex-1 items-end gap-3">
          <DateField
            id="check-in"
            label="Check In"
            value={checkIn}
            onChange={handleCheckInChange}
            disabled={{ before: today }}
            placeholder="Select date"
          />
          <span className="mb-3 hidden text-brand-muted sm:block">–</span>
          <DateField
            id="check-out"
            label="Check Out"
            value={checkOut}
            onChange={setCheckOut}
            disabled={{ before: checkIn ? addDays(checkIn, 1) : addDays(today, 1) }}
            placeholder="Select date"
          />
        </div>

        <RoomsGuestsDropdown
          rooms={rooms}
          guests={guests}
          onRoomsChange={setRooms}
          onGuestsChange={setGuests}
        />

        <button
          type="button"
          onClick={handleSearch}
          className="h-12 w-full rounded-sm border border-brand-primary px-8 text-sm font-medium text-brand-primary hover:bg-brand-surface lg:w-auto"
        >
          Search
        </button>
      </div>
    </div>
  );
}
