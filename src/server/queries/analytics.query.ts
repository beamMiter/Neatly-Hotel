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
  subDays,
  startOfHour,
} from "date-fns";
import { getMockDataset, type MockBooking } from "@/features/analytics/mock-data";
import type {
  DashboardKpis,
  KpiMetric,
  RoomAvailabilityBreakdown,
  BookingTrendDay,
  RevenuePoint,
  OccupancyPoint,
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
  const { bookings, pageViews } = getMockDataset();
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));
  const previousEnd = endOfMonth(subMonths(now, 1));

  const current = kpisForMonth(bookings, currentStart, currentEnd);
  const previous = kpisForMonth(bookings, previousStart, previousEnd);

  const visitorsInRange = (start: Date, end: Date) =>
    new Set(pageViews.filter((v) => v.createdAt >= start && v.createdAt < end).map((v) => v.visitorId)).size;

  return {
    totalBookings: toMetric(current.bookings, previous.bookings),
    totalSales: toMetric(current.sales, previous.sales),
    totalBookingUsers: toMetric(current.users, previous.users),
    totalSiteVisitors: toMetric(visitorsInRange(currentStart, currentEnd), visitorsInRange(previousStart, previousEnd)),
  };
}

// A room is "Occupied" if a guest is physically in it right now (room
// status), "Booked" if it isn't occupied but has a non-cancelled
// reservation overlapping the range (reserved, guest hasn't arrived), and
// "Available" otherwise. Out-of-service rooms are excluded from all three
// — they're not sellable inventory.
export async function getRoomAvailabilityBreakdown(range: DateRange): Promise<RoomAvailabilityBreakdown> {
  const { rooms, bookings } = getMockDataset();
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
  const { bookings } = getMockDataset();
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
  const { bookings } = getMockDataset();
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
  const { rooms, bookings } = getMockDataset();
  const sellableRooms = rooms.filter((room) => room.status !== "Out of Service").length;

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

// "New" = this is the first booking this customer has ever made, and it
// falls in the range. "Returning" = they booked again in the range after
// an earlier booking made before it.
export async function getGuestVisitBreakdown(range: DateRange): Promise<GuestVisitBreakdown> {
  const { bookings } = getMockDataset();

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
  const { bookings } = getMockDataset();
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
  const { bookings } = getMockDataset();
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
  const { pageViews } = getMockDataset();
  const { from, bucket, labelFormat } = trafficRangeFor(rangeKey);
  const to = endOfDay(new Date());

  const countByBucketKey = new Map<string, number>();
  for (const view of pageViews) {
    if (view.createdAt < from || view.createdAt > to) continue;
    const bucketDate = bucket === "hour" ? startOfHour(view.createdAt) : startOfDay(view.createdAt);
    const key = bucketDate.toISOString();
    countByBucketKey.set(key, (countByBucketKey.get(key) ?? 0) + 1);
  }

  const points: TrafficPoint[] = [];
  const step = bucket === "hour" ? 60 * 60 * 1000 : DAY_MS;
  const startBucket = (bucket === "hour" ? startOfHour(from) : startOfDay(from)).getTime();
  const endBucket = (bucket === "hour" ? startOfHour(to) : startOfDay(to)).getTime();

  for (let t = startBucket; t <= endBucket; t += step) {
    const bucketDate = new Date(t);
    points.push({
      label: format(bucketDate, labelFormat),
      count: countByBucketKey.get(bucketDate.toISOString()) ?? 0,
    });
  }
  return points;
}
