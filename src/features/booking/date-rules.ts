const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function bangkokTodayIso(): string {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00+07:00`);
  const end = Date.parse(`${checkOut}T00:00:00+07:00`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const REFUND_WINDOW_MS = 3 * DAY_MS;

// Refund policy: a grace period from when the booking was *made*, not from
// check-in — full refund only if cancelled within 72h (3 days) of booking
// creation. Past that window, cancellation is still allowed (see
// CANCELLABLE_STATUSES in bookings.query.ts) but no refund is issued.
// createdAt is a full timestamp, same convention isChangeDateEligible uses.
export function isRefundEligible(createdAt: string, now: Date = new Date()): boolean {
  const createdTime = Date.parse(createdAt);
  return now.getTime() - createdTime <= REFUND_WINDOW_MS;
}

// Change-date policy: only allowed within 24h of when the booking was made
// (createdAt is a full timestamp, not date-only).
export function isChangeDateEligible(createdAt: string, now: Date = new Date()): boolean {
  const createdTime = Date.parse(createdAt);
  return now.getTime() - createdTime <= DAY_MS;
}

// Matches common OTA conventions (Agoda, Booking.com, AirAsia SNAP) — stays
// longer than this go through direct/long-stay contracts instead of a
// single self-service booking.
export const MAX_STAY_NIGHTS = 30;

export function validateStayDates(
  checkIn: string,
  checkOut: string,
): string | null {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return "Check-in and check-out must be valid dates (YYYY-MM-DD)";
  }

  const today = bangkokTodayIso();
  if (checkIn < today) {
    return "Check-in cannot be in the past";
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    return "Check-out must be at least one night after check-in";
  }

  if (nights > MAX_STAY_NIGHTS) {
    return `Stay cannot exceed ${MAX_STAY_NIGHTS} nights — please contact the hotel directly for long-stay bookings`;
  }

  return null;
}
