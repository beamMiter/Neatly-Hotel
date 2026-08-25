// Self-contained, in-memory mock dataset for the Analytics Dashboard only.
//
// The dashboard needs ~2 years of transactional history (bookings +
// page views) to produce meaningful trend charts. Writing that much
// synthetic data into the shared Supabase project would bloat it for
// everyone just to make one page's charts look populated — so instead
// this generates a deterministic (seeded) dataset once, in memory, that
// analytics.query.ts reads from directly. No other feature touches this
// file; Customer Booking, Room Management, etc. all still read the real
// database as before.

import { startOfDay } from "date-fns";

const DAYS = 730; // ~2 years
const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the real room_types catalog (name -> nightly price) and the real
// per-type room counts, so the mock room pool looks like the actual hotel.
const ROOM_TYPE_COUNTS: [string, number, string][] = [
  // [name, room count, bed type]
  ["Standard Room", 5, "Double Bed"],
  ["Superior", 4, "Double Bed"],
  ["Superior Room", 5, "Double Bed"],
  ["Garden View Room", 6, "Double Bed"],
  ["Superior Garden View", 8, "Double Bed"],
  ["Deluxe", 4, "King Bed"],
  ["Deluxe Room", 4, "King Bed"],
  ["Deluxe Twin Room", 4, "Twin Beds"],
  ["Premier Sea View", 5, "Queen Bed"],
  ["Premier Sea View Room", 6, "Queen Bed"],
  ["Supreme", 5, "King Bed"],
  ["Family Suite", 4, "Queen Bed"],
  ["Suit", 3, "King Bed"],
  ["Executive Suite", 2, "King Bed"],
  ["Honeymoon Pool Villa", 4, "King Bed"],
  ["Presidential Suite", 1, "Super King Bed"],
];

const ROOM_TYPE_PRICE: Record<string, number> = {
  "Standard Room": 1800,
  Superior: 2350,
  "Superior Room": 2400,
  "Garden View Room": 2600,
  "Superior Garden View": 2900,
  Deluxe: 3100,
  "Deluxe Room": 3200,
  "Deluxe Twin Room": 3200,
  "Premier Sea View": 4300,
  "Premier Sea View Room": 4500,
  Supreme: 5200,
  "Family Suite": 6500,
  Suit: 6800,
  "Executive Suite": 7800,
  "Honeymoon Pool Villa": 12000,
  "Presidential Suite": 18000,
};

const ROOM_STATUS_POOL = [
  "Occupied",
  "Occupied Clean",
  "Occupied Dirty",
  "Vacant",
  "Vacant Clean",
  "Vacant Clean Inspected",
  "Vacant Clean Pick Up",
  "Assign Clean",
  "Assign Dirty",
  "Out of Service",
];

const FIRST_NAMES = [
  "James", "Emma", "Somchai", "Yuki", "Kate", "Nattapong", "Liam", "Olivia", "Wei", "Nok",
  "Arthit", "Sophie", "Hiro", "Min-jun", "Isabella", "Noah", "Ploy", "Ken", "Aiden", "Mia",
];
const LAST_NAMES = [
  "Anderson", "Watson", "Suksan", "Tanaka", "Cho", "Charoen", "Smith", "Johnson", "Chen", "Srisai",
  "Wongsa", "Miller", "Sato", "Park", "Brown", "Davis", "Suwan", "Lee", "Taylor", "Kittisak",
];

// mulberry32 — tiny seeded PRNG. Deterministic so the dashboard shows the
// same "history" on every server restart instead of reshuffling.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MockRoom = { id: string; roomType: string; bedType: string; status: string };

export type MockBooking = {
  id: string;
  customerId: string;
  createdAt: Date;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: "confirmed" | "checked_in" | "completed" | "cancelled" | "pending_payment";
  paymentMethod: "credit_card" | "cash";
  totalAmount: number;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  roomIds: string[];
};

export type MockPageView = { visitorId: string; createdAt: Date };

export type MockDataset = {
  rooms: MockRoom[];
  bookings: MockBooking[];
  pageViews: MockPageView[];
};

function buildRooms(random: () => number): MockRoom[] {
  const rooms: MockRoom[] = [];
  let roomNo = 100;
  for (const [roomType, count, bedType] of ROOM_TYPE_COUNTS) {
    for (let i = 0; i < count; i++) {
      roomNo += 1;
      rooms.push({
        id: `room-${roomNo}`,
        roomType,
        bedType,
        status: ROOM_STATUS_POOL[Math.floor(random() * ROOM_STATUS_POOL.length)],
      });
    }
  }
  return rooms;
}

function pick<T>(random: () => number, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function weightedStatus(random: () => number, checkOut: Date, now: Date): MockBooking["status"] {
  const roll = random();
  if (roll < 0.06) return "cancelled";
  if (roll < 0.09) return "pending_payment";
  // Otherwise the lifecycle follows the dates: already checked out if the
  // stay is over, checked in if it's ongoing, confirmed if still upcoming.
  if (checkOut < now) return "completed";
  return "confirmed";
}

function buildBookings(random: () => number, rooms: MockRoom[], now: Date): MockBooking[] {
  const bookings: MockBooking[] = [];
  const customerPool: string[] = [];
  let bookingSeq = 0;

  for (let dayOffset = DAYS; dayOffset >= 0; dayOffset--) {
    const createdAt = new Date(now.getTime() - dayOffset * DAY_MS);
    const dow = createdAt.getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.4 : 1;
    const bookingsToday = Math.round((1 + random() * 4) * weekendBoost);

    for (let i = 0; i < bookingsToday; i++) {
      bookingSeq += 1;

      // ~35% chance of reusing an existing customer (returning guest),
      // otherwise mint a new one — keeps the customer pool growing over
      // time instead of being fixed from day one.
      const isReturning = customerPool.length > 0 && random() < 0.35;
      const customerId = isReturning
        ? pick(random, customerPool)
        : `guest-${customerPool.length + 1}-${pick(random, FIRST_NAMES)}-${pick(random, LAST_NAMES)}`;
      if (!isReturning) customerPool.push(customerId);

      const nights = 1 + Math.floor(random() * 4);
      const leadDays = Math.floor(random() * 45) - 5; // some same-day/walk-in, most booked ahead
      const checkIn = new Date(createdAt.getTime() + leadDays * DAY_MS);
      const checkOut = new Date(checkIn.getTime() + nights * DAY_MS);

      const roomCount = random() < 0.85 ? 1 : random() < 0.7 ? 2 : 3;
      const roomIds: string[] = [];
      const roomType = pick(random, ROOM_TYPE_COUNTS)[0];
      const candidateRooms = rooms.filter((room) => room.roomType === roomType);
      for (let r = 0; r < roomCount && r < candidateRooms.length; r++) {
        roomIds.push(candidateRooms[(Math.floor(random() * candidateRooms.length) + r) % candidateRooms.length].id);
      }

      const status = weightedStatus(random, checkOut, now);
      const pricePerNight = ROOM_TYPE_PRICE[roomType] ?? 2000;
      const totalAmount = status === "cancelled" ? 0 : pricePerNight * nights * roomIds.length;

      // Real check-in/out times cluster around plausible hotel hours —
      // afternoon arrival, late-morning departure — with some spread, so
      // the "average time" widget produces a believable value.
      const checkedInAt =
        status === "checked_in" || status === "completed"
          ? new Date(checkIn.getTime() + (14 + random() * 5) * 60 * 60 * 1000)
          : null;
      const checkedOutAt =
        status === "completed" ? new Date(checkOut.getTime() + (9 + random() * 4) * 60 * 60 * 1000) : null;

      bookings.push({
        id: `booking-${bookingSeq}`,
        customerId,
        createdAt,
        checkIn,
        checkOut,
        guests: 1 + Math.floor(random() * 4),
        status,
        paymentMethod: random() < 0.7 ? "credit_card" : "cash",
        totalAmount,
        checkedInAt,
        checkedOutAt,
        roomIds,
      });
    }
  }

  return bookings;
}

function buildPageViews(random: () => number, now: Date): MockPageView[] {
  const pageViews: MockPageView[] = [];
  const visitorPool: string[] = Array.from({ length: 4000 }, (_, index) => `visitor-${index + 1}`);

  for (let dayOffset = DAYS; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(now.getTime() - dayOffset * DAY_MS);
    const dow = dayStart.getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.75 : 1;
    const viewsToday = Math.round((40 + random() * 140) * weekendDip);

    for (let i = 0; i < viewsToday; i++) {
      // Daytime-weighted hour: two passes biases the distribution toward
      // the middle of the day without a heavier distribution function.
      const hour = Math.floor(((random() + random()) / 2) * 24);
      const minute = Math.floor(random() * 60);
      const createdAt = new Date(dayStart);
      createdAt.setHours(hour, minute, Math.floor(random() * 60), 0);

      // Most visits are unique guests; a minority reuse a visitor id,
      // which is what makes "new vs returning" trackable at all.
      const visitorId = random() < 0.8 ? pick(random, visitorPool) : `visitor-one-off-${dayOffset}-${i}`;
      pageViews.push({ visitorId, createdAt });
    }
  }

  return pageViews;
}

let cachedDataset: MockDataset | null = null;

// Generated once per process and reused — regenerating ~2 years of data on
// every request would be wasteful, and would also make numbers drift
// between requests within the same page load.
export function getMockDataset(): MockDataset {
  if (cachedDataset) return cachedDataset;

  const random = mulberry32(20260825);
  // Midnight-aligned: buildBookings/buildPageViews add fixed hour-of-day
  // offsets (e.g. "checked in around 2-7pm") on top of `now`-derived dates.
  // A non-midnight `now` would let those offsets carry over into the next
  // calendar day unpredictably depending on what time this happens to run.
  const now = startOfDay(new Date());
  const rooms = buildRooms(random);
  const bookings = buildBookings(random, rooms, now);
  const pageViews = buildPageViews(random, now);

  cachedDataset = { rooms, bookings, pageViews };
  return cachedDataset;
}
