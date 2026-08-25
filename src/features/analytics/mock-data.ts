// Hardcoded ~2-year mock dataset for the Analytics Dashboard only — every
// other feature (Customer Booking, Room Management, the real bookings/
// page_views tables, etc.) still reads the real database as normal.
//
// The dashboard needs enough transactional volume for its trend charts to
// look real. Writing that much synthetic history into the shared Supabase
// project would burn through its storage for everyone just to make one
// admin page's charts look populated — so instead this data lives here,
// generated once and dumped as plain JSON (no randomness, no generation
// algorithm runs at request time — mock-rooms.json / mock-bookings.json /
// mock-traffic.json ARE the data).
//
// Stored as .json rather than TS array literals on purpose: with ~2500
// bookings typed against a union field like `status`, TypeScript's own
// checker blows up ("union type too complex to represent") trying to
// verify every literal entry contextually. A JSON import gets widened
// string/number types instead, which sidesteps that entirely.
//
// Dates are stored as offsets ("N days before now", "N hours from
// midnight") rather than absolute timestamps: hardcoding absolute dates
// would make "this month" / "last month" comparisons go stale and
// eventually show nothing at all once enough real time passes after this
// data was generated. The offsets get anchored to the real current time
// once, below, so the dashboard always reads as a rolling ~2-year window
// ending today — the anchoring is simple arithmetic, not a re-generation
// of the data itself.
//
// Page views are pre-aggregated into per-day-per-hour buckets (view count
// + unique-visitor count) rather than individual raw events — every
// consumer only ever needs bucketed counts, and hardcoding tens of
// thousands of raw events would have made this file many times larger for
// no benefit. Bookings are kept as individual records since several
// metrics genuinely need per-booking date ranges and room associations.

import rawRooms from "./mock-rooms.json";
import rawBookings from "./mock-bookings.json";
import rawTrafficBuckets from "./mock-traffic.json";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MockRoom = { id: string; roomType: string; bedType: string; status: string };

export type MockBookingStatus = "confirmed" | "checked_in" | "completed" | "cancelled" | "pending_payment";
export type MockPaymentMethod = "credit_card" | "cash";

export type MockBooking = {
  id: string;
  customerId: string;
  createdAt: Date;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: MockBookingStatus;
  paymentMethod: MockPaymentMethod;
  totalAmount: number;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  roomIds: string[];
};

export type MockTrafficBucket = { date: string; hour: number; views: number; uniqueVisitors: number };

type RawBooking = {
  id: string;
  customerId: string;
  createdAtDaysAgo: number;
  checkInDaysAgo: number;
  checkOutDaysAgo: number;
  guests: number;
  status: MockBookingStatus;
  paymentMethod: MockPaymentMethod;
  totalAmount: number;
  checkedInOffsetHours: number | null;
  checkedOutOffsetHours: number | null;
  roomIds: string[];
};

type RawTrafficBucket = { daysAgo: number; hour: number; views: number; uniqueVisitors: number };

export const MOCK_ROOMS: MockRoom[] = rawRooms as MockRoom[];

const RAW_BOOKINGS = rawBookings as RawBooking[];
const RAW_TRAFFIC_BUCKETS = rawTrafficBuckets as RawTrafficBucket[];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Anchors every relative offset to the real "now" once per calendar day —
// plain arithmetic over fixed numbers, not a re-run of any generation
// logic. Cached so repeated calls within the same process (e.g. multiple
// analytics queries on one page load) don't redo the conversion.
let cachedDay: number | null = null;
let cachedBookings: MockBooking[] | null = null;
let cachedTrafficBuckets: MockTrafficBucket[] | null = null;

function today(): Date {
  const day = startOfDay(new Date()).getTime();
  if (cachedDay !== day) {
    cachedDay = day;
    cachedBookings = null;
    cachedTrafficBuckets = null;
  }
  return new Date(day);
}

export function getMockBookings(): MockBooking[] {
  if (cachedBookings) return cachedBookings;
  const now = today().getTime();

  cachedBookings = RAW_BOOKINGS.map((b) => {
    const checkIn = new Date(now - b.checkInDaysAgo * DAY_MS);
    const checkOut = new Date(now - b.checkOutDaysAgo * DAY_MS);
    return {
      id: b.id,
      customerId: b.customerId,
      createdAt: new Date(now - b.createdAtDaysAgo * DAY_MS),
      checkIn,
      checkOut,
      guests: b.guests,
      status: b.status,
      paymentMethod: b.paymentMethod,
      totalAmount: b.totalAmount,
      checkedInAt:
        b.checkedInOffsetHours === null ? null : new Date(checkIn.getTime() + b.checkedInOffsetHours * 60 * 60 * 1000),
      checkedOutAt:
        b.checkedOutOffsetHours === null ? null : new Date(checkOut.getTime() + b.checkedOutOffsetHours * 60 * 60 * 1000),
      roomIds: b.roomIds,
    };
  });
  return cachedBookings;
}

export function getMockTrafficBuckets(): MockTrafficBucket[] {
  if (cachedTrafficBuckets) return cachedTrafficBuckets;
  const now = today().getTime();

  cachedTrafficBuckets = RAW_TRAFFIC_BUCKETS.map((bucket) => ({
    date: dateKey(new Date(now - bucket.daysAgo * DAY_MS)),
    hour: bucket.hour,
    views: bucket.views,
    uniqueVisitors: bucket.uniqueVisitors,
  }));
  return cachedTrafficBuckets;
}
