import "server-only";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachMonthOfInterval,
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  subDays,
  startOfHour,
} from "date-fns";
import { MOCK_ROOMS, getMockBookings, getMockTrafficBuckets, type MockBooking } from "@/features/analytics/mock-data";
import type {
  DashboardKpis,
  KpiMetric,
  RoomAvailabilityBreakdown,
  BookingTrendDay,
  RevenuePoint,
  OccupancyPoint,
  OccupancyByRoomTypeSeries,
  GuestVisitBreakdown,
  PaymentMethodBreakdown,
  CheckInOutAverages,
  TrafficPoint,
  DateRange,
} from "@/types/analytics";

// This whole file reads from the in-memory mock dataset (mock-data.ts),
// not the real database — see that file's header comment for why. Every
// other feature in the app still reads real data as normal.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isCancelled(booking: MockBooking): boolean {
  return booking.status === "cancelled";
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function toMetric(current: number, previous: number): KpiMetric {
  return { value: current, changePct: pctChange(current, previous) };
}

function kpisForMonth(bookings: MockBooking[], start: Date, end: Date) {
  const inMonth = bookings.filter((b) => !isCancelled(b) && b.createdAt >= start && b.createdAt < end);
  return {
    bookings: inMonth.length,
    sales: inMonth.reduce((sum, b) => sum + b.totalAmount, 0),
    users: new Set(inMonth.map((b) => b.customerId)).size,
  };
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const bookings = getMockBookings();
  const trafficBuckets = getMockTrafficBuckets();
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));
  const previousEnd = endOfMonth(subMonths(now, 1));

  const current = kpisForMonth(bookings, currentStart, currentEnd);
  const previous = kpisForMonth(bookings, previousStart, previousEnd);

  // Buckets only store a per-hour unique-visitor count, not the underlying
  // visitor ids, so this sums those counts across the month rather than
  // computing a true set union — a returning visitor across two days
  // double-counts. Acceptable for mock data whose job is to look
  // plausible, not to reconcile exactly against raw events we deliberately
  // didn't keep (see mock-data.ts's header comment).
  const visitorsInRange = (start: Date, end: Date) =>
    trafficBuckets
      .filter((bucket) => {
        const bucketDate = new Date(`${bucket.date}T00:00:00`);
        bucketDate.setHours(bucket.hour);
        return bucketDate >= start && bucketDate < end;
      })
      .reduce((sum, bucket) => sum + bucket.uniqueVisitors, 0);

  return {
    totalBookings: toMetric(current.bookings, previous.bookings),
    totalSales: toMetric(current.sales, previous.sales),
    totalBookingUsers: toMetric(current.users, previous.users),
    totalSiteVisitors: toMetric(visitorsInRange(currentStart, currentEnd), visitorsInRange(previousStart, previousEnd)),
  };
}

export type OverviewPeriodKey = "month" | "week" | "today";

// Shared by Room Availability and Booking Trends' period dropdown. Always
// anchored to "now" as the upper bound (not the end of the calendar
// month/week) — matches this dashboard's original "this month" default.
// Monday-start week to match Booking Trends' Mon..Sun bar order.
export function overviewRangeFor(key: OverviewPeriodKey): DateRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

export type BookingTrendsPeriodKey = "month" | "last_month" | "last_2_months";

// "month" mirrors overviewRangeFor("month") (this calendar month to date).
// "last_month"/"last_2_months" are the previous 1-2 FULL calendar months,
// excluding the current still-in-progress one, so the weekday mix reflects
// completed months rather than a partial one skewing the percentages.
export function bookingTrendsRangeFor(key: BookingTrendsPeriodKey): DateRange {
  const now = new Date();
  switch (key) {
    case "month":
      return overviewRangeFor("month");
    case "last_month":
      return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case "last_2_months":
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(subMonths(now, 1)) };
  }
}

// A room is "Occupied" if a guest is physically in it right now (room
// status), "Booked" if it isn't occupied but has a non-cancelled
// reservation overlapping the range (reserved, guest hasn't arrived), and
// "Available" otherwise. Out-of-service rooms are excluded from all three
// — they're not sellable inventory.
export async function getRoomAvailabilityBreakdown(range: DateRange): Promise<RoomAvailabilityBreakdown> {
  const rooms = MOCK_ROOMS;
  const bookings = getMockBookings();
  let occupied = 0;
  let booked = 0;
  let available = 0;

  for (const room of rooms) {
    if (room.status.startsWith("Occupied")) {
      occupied += 1;
      continue;
    }
    if (room.status === "Out of Service") continue;

    const hasOverlappingBooking = bookings.some(
      (b) => !isCancelled(b) && b.roomIds.includes(room.id) && b.checkIn <= range.to && b.checkOut >= range.from,
    );
    if (hasOverlappingBooking) booked += 1;
    else available += 1;
  }

  return { occupied, booked, available };
}

// Each weekday's share of total bookings (by check-in date) within the
// range — the 7 bars always sum to 100%.
export async function getBookingTrendsByDay(range: DateRange): Promise<BookingTrendDay[]> {
  const bookings = getMockBookings();
  const inRange = bookings.filter((b) => !isCancelled(b) && b.checkIn >= range.from && b.checkIn <= range.to);

  const countByDow = new Map<number, number>();
  for (const b of inRange) {
    const dow = b.checkIn.getDay();
    countByDow.set(dow, (countByDow.get(dow) ?? 0) + 1);
  }

  const total = inRange.length;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dow) => ({
    day: WEEKDAY_LABELS[dow],
    percentage: total === 0 ? 0 : Math.round(((countByDow.get(dow) ?? 0) / total) * 1000) / 10,
  }));
}

export async function getRevenueTrend(range: DateRange): Promise<RevenuePoint[]> {
  const bookings = getMockBookings();
  const inRange = bookings.filter((b) => !isCancelled(b) && b.createdAt >= range.from && b.createdAt <= range.to);

  const amountByMonth = new Map<string, number>();
  for (const b of inRange) {
    const key = format(b.createdAt, "yyyy-MM");
    amountByMonth.set(key, (amountByMonth.get(key) ?? 0) + b.totalAmount);
  }

  return eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => ({
    month: format(month, "MMMM"),
    amount: amountByMonth.get(format(month, "yyyy-MM")) ?? 0,
  }));
}

// Occupancy rate per month = occupied room-nights / (sellable rooms x days
// in that month). Every non-cancelled booking is expanded into its
// individual nights so one that spans a month boundary splits correctly
// instead of counting whole against one side.
export async function getOccupancyTrend(range: DateRange): Promise<OccupancyPoint[]> {
  const bookings = getMockBookings();
  const sellableRooms = MOCK_ROOMS.filter((room) => room.status !== "Out of Service").length;

  const nightsByMonth = new Map<string, number>();
  for (const b of bookings) {
    if (isCancelled(b)) continue;
    if (b.checkIn >= range.to || b.checkOut <= range.from) continue;

    for (let t = b.checkIn.getTime(); t < b.checkOut.getTime(); t += DAY_MS) {
      const night = new Date(t);
      if (night < range.from || night > range.to) continue;
      const key = format(night, "yyyy-MM");
      nightsByMonth.set(key, (nightsByMonth.get(key) ?? 0) + b.roomIds.length);
    }
  }

  return eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => {
    const daysInMonth = differenceInCalendarDays(endOfMonth(month), startOfMonth(month)) + 1;
    const totalRoomNights = sellableRooms * daysInMonth;
    const occupied = nightsByMonth.get(format(month, "yyyy-MM")) ?? 0;
    return {
      month: format(month, "MMMM"),
      ratePct: totalRoomNights === 0 ? 0 : Math.round((occupied / totalRoomNights) * 1000) / 10,
    };
  });
}

// The "Room types" view of Occupancy Rate. Same room-nights math as
// getOccupancyTrend, split per room type instead of pooled across the whole
// hotel. Capped at MAX_ROOM_TYPE_SERIES series (matching the categorical
// palette's 8 fixed hue slots) — a real hotel can have far more room types
// than that, and a 9th+ generated color isn't distinguishable, so the
// smallest room types by occupied room-nights fold into a trailing "Other".
const MAX_ROOM_TYPE_SERIES = 8;

export async function getOccupancyTrendByRoomType(range: DateRange): Promise<OccupancyByRoomTypeSeries> {
  const bookings = getMockBookings();
  const roomTypeById = new Map(MOCK_ROOMS.map((room) => [room.id, room.roomType]));

  const sellableRoomsByType = new Map<string, number>();
  for (const room of MOCK_ROOMS) {
    if (room.status === "Out of Service") continue;
    sellableRoomsByType.set(room.roomType, (sellableRoomsByType.get(room.roomType) ?? 0) + 1);
  }

  const nightsByMonthAndType = new Map<string, Map<string, number>>();
  const totalNightsByType = new Map<string, number>();

  for (const b of bookings) {
    if (isCancelled(b)) continue;
    if (b.checkIn >= range.to || b.checkOut <= range.from) continue;

    for (let t = b.checkIn.getTime(); t < b.checkOut.getTime(); t += DAY_MS) {
      const night = new Date(t);
      if (night < range.from || night > range.to) continue;
      const monthKey = format(night, "yyyy-MM");
      const byType = nightsByMonthAndType.get(monthKey) ?? new Map<string, number>();
      nightsByMonthAndType.set(monthKey, byType);

      for (const roomId of b.roomIds) {
        const roomType = roomTypeById.get(roomId);
        if (!roomType) continue;
        byType.set(roomType, (byType.get(roomType) ?? 0) + 1);
        totalNightsByType.set(roomType, (totalNightsByType.get(roomType) ?? 0) + 1);
      }
    }
  }

  const rankedTypes = [...totalNightsByType.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
  const hasOverflow = rankedTypes.length > MAX_ROOM_TYPE_SERIES;
  const topTypes = hasOverflow ? rankedTypes.slice(0, MAX_ROOM_TYPE_SERIES - 1) : rankedTypes;
  const foldedTypes = new Set(hasOverflow ? rankedTypes.slice(MAX_ROOM_TYPE_SERIES - 1) : []);
  const seriesNames = hasOverflow ? [...topTypes, "Other"] : topTypes;

  const points = eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => {
    const monthKey = format(month, "yyyy-MM");
    const daysInMonth = differenceInCalendarDays(endOfMonth(month), startOfMonth(month)) + 1;
    const byType = nightsByMonthAndType.get(monthKey) ?? new Map<string, number>();

    const rates: Record<string, number> = {};
    for (const type of topTypes) {
      const sellable = sellableRoomsByType.get(type) ?? 0;
      const occupied = byType.get(type) ?? 0;
      rates[type] = sellable === 0 ? 0 : Math.round((occupied / (sellable * daysInMonth)) * 1000) / 10;
    }

    if (hasOverflow) {
      let otherSellable = 0;
      let otherOccupied = 0;
      for (const type of foldedTypes) {
        otherSellable += sellableRoomsByType.get(type) ?? 0;
        otherOccupied += byType.get(type) ?? 0;
      }
      rates.Other = otherSellable === 0 ? 0 : Math.round((otherOccupied / (otherSellable * daysInMonth)) * 1000) / 10;
    }

    return { month: format(month, "MMMM"), rates };
  });

  return { seriesNames, points };
}

// "New" = this is the first booking this customer has ever made, and it
// falls in the range. "Returning" = they booked again in the range after
// an earlier booking made before it.
export async function getGuestVisitBreakdown(range: DateRange): Promise<GuestVisitBreakdown> {
  const bookings = getMockBookings();

  const firstBookingByCustomer = new Map<string, Date>();
  for (const b of bookings) {
    const existing = firstBookingByCustomer.get(b.customerId);
    if (!existing || b.createdAt < existing) firstBookingByCustomer.set(b.customerId, b.createdAt);
  }

  const inRangeCustomerIds = new Set(
    bookings
      .filter((b) => !isCancelled(b) && b.createdAt >= range.from && b.createdAt <= range.to)
      .map((b) => b.customerId),
  );

  let newGuests = 0;
  let returningGuests = 0;
  for (const customerId of inRangeCustomerIds) {
    const firstAt = firstBookingByCustomer.get(customerId);
    if (!firstAt) continue;
    if (firstAt >= range.from && firstAt <= range.to) newGuests += 1;
    else if (firstAt < range.from) returningGuests += 1;
  }

  return { newGuests, returningGuests };
}

export async function getPaymentMethodBreakdown(range: DateRange): Promise<PaymentMethodBreakdown> {
  const bookings = getMockBookings();
  const inRange = bookings.filter((b) => !isCancelled(b) && b.createdAt >= range.from && b.createdAt <= range.to);

  let creditCard = 0;
  let cash = 0;
  for (const b of inRange) {
    if (b.paymentMethod === "credit_card") creditCard += 1;
    else cash += 1;
  }

  return { creditCard, cash };
}

function secondsOfDay(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function formatSecondsOfDay(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function getCheckInOutAverages(): Promise<CheckInOutAverages> {
  const bookings = getMockBookings();
  const checkInSeconds = bookings.filter((b) => b.checkedInAt).map((b) => secondsOfDay(b.checkedInAt as Date));
  const checkOutSeconds = bookings.filter((b) => b.checkedOutAt).map((b) => secondsOfDay(b.checkedOutAt as Date));

  const avgCheckIn = average(checkInSeconds);
  const avgCheckOut = average(checkOutSeconds);

  return {
    avgCheckInTime: avgCheckIn === null ? null : formatSecondsOfDay(avgCheckIn),
    avgCheckOutTime: avgCheckOut === null ? null : formatSecondsOfDay(avgCheckOut),
  };
}

export type TrafficRangeKey = "realtime" | "yesterday" | "7d" | "30d";

function trafficRangeFor(key: TrafficRangeKey): { from: Date; bucket: "hour" | "day"; labelFormat: string } {
  const now = new Date();
  switch (key) {
    case "realtime":
      return { from: subDays(startOfHour(now), 1), bucket: "hour", labelFormat: "h a" };
    case "yesterday":
      return { from: startOfDay(subDays(now, 1)), bucket: "hour", labelFormat: "h a" };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), bucket: "day", labelFormat: "EEE" };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), bucket: "day", labelFormat: "d MMM" };
  }
}

export async function getWebsiteTraffic(rangeKey: TrafficRangeKey): Promise<TrafficPoint[]> {
  const trafficBuckets = getMockTrafficBuckets();
  const { from, bucket, labelFormat } = trafficRangeFor(rangeKey);
  const to = endOfDay(new Date());

  // Keyed by "yyyy-MM-dd|hour" — already the bucket's own granularity, so
  // no re-bucketing needed, just a lookup.
  const viewsByKey = new Map<string, number>();
  for (const b of trafficBuckets) {
    const key = `${b.date}|${b.hour}`;
    viewsByKey.set(key, (viewsByKey.get(key) ?? 0) + b.views);
  }

  const points: TrafficPoint[] = [];
  const step = bucket === "hour" ? 60 * 60 * 1000 : DAY_MS;
  const startBucket = (bucket === "hour" ? startOfHour(from) : startOfDay(from)).getTime();
  const endBucket = (bucket === "hour" ? startOfHour(to) : startOfDay(to)).getTime();

  for (let t = startBucket; t <= endBucket; t += step) {
    const bucketDate = new Date(t);
    const dateKey = format(bucketDate, "yyyy-MM-dd");
    let count = 0;
    if (bucket === "hour") {
      count = viewsByKey.get(`${dateKey}|${bucketDate.getHours()}`) ?? 0;
    } else {
      for (let hour = 0; hour < 24; hour++) count += viewsByKey.get(`${dateKey}|${hour}`) ?? 0;
    }
    points.push({ label: format(bucketDate, labelFormat), count });
  }
  return points;
}
