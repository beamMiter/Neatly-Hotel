import { format } from "date-fns";
import type { SearchQuery } from "@/types/room-search";
import { bangkokTodayIso, nightsBetween } from "@/features/booking/date-rules";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRoomTypeUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function defaultBookingSearchQuery(): SearchQuery {
  const checkIn = bangkokTodayIso();
  const [year, month, day] = checkIn.split("-").map(Number);
  const checkOutDate = new Date(Date.UTC(year, month - 1, day + 1));
  const checkOut = `${checkOutDate.getUTCFullYear()}-${String(checkOutDate.getUTCMonth() + 1).padStart(2, "0")}-${String(checkOutDate.getUTCDate()).padStart(2, "0")}`;

  return {
    checkIn,
    checkOut,
    rooms: 1,
    guests: 2,
  };
}

export function buildBookingHref(roomTypeId: string, search: SearchQuery = defaultBookingSearchQuery()) {
  const params = new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: String(search.guests),
    rooms: String(search.rooms),
  });

  return `/booking/${roomTypeId}?${params.toString()}`;
}

export function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export type StayDayOption = {
  iso: string;
  label: string;
};

/** Morning dates when a per-day service (e.g. breakfast) can apply during the stay. */
export function getStayServiceDays(checkIn: string, checkOut: string): StayDayOption[] {
  const nights = nightsBetween(checkIn, checkOut);
  const [year, month, day] = checkIn.split("-").map(Number);
  const options: StayDayOption[] = [];

  for (let offset = 1; offset <= nights; offset += 1) {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    options.push({
      iso,
      label: format(new Date(`${iso}T00:00:00`), "EEE, dd MMM"),
    });
  }

  return options;
}

export function getDefaultPaidAddOnDays(checkIn: string, checkOut: string): string[] {
  return getStayServiceDays(checkIn, checkOut).map((day) => day.iso);
}
