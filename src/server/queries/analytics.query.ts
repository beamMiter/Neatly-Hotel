import "server-only";
import { Prisma } from "@prisma/client";
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
import { prisma } from "@/server/db";
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

// A cancelled booking never happened commercially — excluded from every
// count/sum in this file. Distinct from bookings.query.ts's
// NON_BLOCKING_BOOKING_STATUSES (which also drops completed/refunded,
// since those *did* occupy a room and should still count as sales/visits).
const CANCELLED_STATUSES = Prisma.sql`('cancelled', 'canceled')`;
const OUT_OF_SERVICE_STATUSES = Prisma.sql`('Out of Order', 'Out of Service', 'Out of Inventory')`;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function toMetric(current: number, previous: number): KpiMetric {
  return { value: current, changePct: pctChange(current, previous) };
}

async function bookingKpisForMonth(monthStart: Date, monthEnd: Date) {
  const rows = await prisma.$queryRaw<{ bookings_count: bigint; sales_sum: Prisma.Decimal | null; users_count: bigint }[]>`
    select
      count(*)::bigint as bookings_count,
      coalesce(sum(total_amount), 0) as sales_sum,
      count(distinct customer_id)::bigint as users_count
    from bookings
    where created_at >= ${monthStart} and created_at < ${monthEnd}
      and status not in ${CANCELLED_STATUSES}
  `;
  const row = rows[0];
  return {
    bookings: Number(row?.bookings_count ?? 0),
    sales: Number(row?.sales_sum ?? 0),
    users: Number(row?.users_count ?? 0),
  };
}

async function siteVisitorsForMonth(monthStart: Date, monthEnd: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ visitor_count: bigint }[]>`
    select count(distinct visitor_id)::bigint as visitor_count
    from page_views
    where created_at >= ${monthStart} and created_at < ${monthEnd}
  `;
  return Number(rows[0]?.visitor_count ?? 0);
}

// Every KPI card compares the current calendar month to the previous one —
// matches the mockup's "up/down X% from last month" line under each card.
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));
  const previousEnd = endOfMonth(subMonths(now, 1));

  const [current, previous, currentVisitors, previousVisitors] = await Promise.all([
    bookingKpisForMonth(currentStart, currentEnd),
    bookingKpisForMonth(previousStart, previousEnd),
    siteVisitorsForMonth(currentStart, currentEnd),
    siteVisitorsForMonth(previousStart, previousEnd),
  ]);

  return {
    totalBookings: toMetric(current.bookings, previous.bookings),
    totalSales: toMetric(current.sales, previous.sales),
    totalBookingUsers: toMetric(current.users, previous.users),
    totalSiteVisitors: toMetric(currentVisitors, previousVisitors),
  };
}

// A room is "Occupied" if a guest is physically in it right now (room
// status), "Booked" if it isn't occupied but has a non-cancelled
// reservation overlapping the range (reserved, guest hasn't arrived), and
// "Available" otherwise. Out-of-service rooms are excluded from all three
// — they're not sellable inventory.
export async function getRoomAvailabilityBreakdown(range: DateRange): Promise<RoomAvailabilityBreakdown> {
  const rows = await prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
    select
      case
        when r.status like 'Occupied%' then 'occupied'
        when r.status in ${OUT_OF_SERVICE_STATUSES} then 'out_of_service'
        when exists (
          select 1 from booking_rooms br
          join bookings b on b.id = br.booking_id
          where br.room_id = r.id
            and b.status not in ${CANCELLED_STATUSES}
            and b.check_in <= ${range.to} and b.check_out >= ${range.from}
        ) then 'booked'
        else 'available'
      end as bucket,
      count(*)::bigint as count
    from rooms r
    group by 1
  `;

  const byBucket = new Map(rows.map((row) => [row.bucket, Number(row.count)]));
  return {
    occupied: byBucket.get("occupied") ?? 0,
    booked: byBucket.get("booked") ?? 0,
    available: byBucket.get("available") ?? 0,
  };
}

// Each weekday's share of total bookings (by check-in date) within the
// range — the 7 bars always sum to 100%.
export async function getBookingTrendsByDay(range: DateRange): Promise<BookingTrendDay[]> {
  const rows = await prisma.$queryRaw<{ dow: number; count: bigint }[]>`
    select extract(dow from check_in)::int as dow, count(*)::bigint as count
    from bookings
    where check_in >= ${range.from} and check_in <= ${range.to}
      and status not in ${CANCELLED_STATUSES}
    group by 1
  `;

  const countByDow = new Map(rows.map((row) => [row.dow, Number(row.count)]));
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

  // Rendered Mon-Sun to match the mockup, even though Postgres' dow is
  // Sun=0..Sat=6.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dow) => ({
    day: WEEKDAY_LABELS[dow],
    percentage: total === 0 ? 0 : Math.round(((countByDow.get(dow) ?? 0) / total) * 1000) / 10,
  }));
}

export async function getRevenueTrend(range: DateRange): Promise<RevenuePoint[]> {
  const rows = await prisma.$queryRaw<{ month: Date; amount: Prisma.Decimal }[]>`
    select date_trunc('month', created_at) as month, coalesce(sum(total_amount), 0) as amount
    from bookings
    where created_at >= ${range.from} and created_at <= ${range.to}
      and status not in ${CANCELLED_STATUSES}
    group by 1
    order by 1
  `;

  const amountByMonth = new Map(rows.map((row) => [format(row.month, "yyyy-MM"), Number(row.amount)]));
  return eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => ({
    month: format(month, "MMMM"),
    amount: amountByMonth.get(format(month, "yyyy-MM")) ?? 0,
  }));
}

// Occupancy rate per month = occupied room-nights / (sellable rooms x days
// in that month). Room-nights are computed by expanding every non-cancelled
// booking into its individual nights (generate_series), so a booking that
// spans a month boundary is split correctly instead of counted whole
// against one side.
export async function getOccupancyTrend(range: DateRange): Promise<OccupancyPoint[]> {
  const [nightsRows, sellableRoomsRows] = await Promise.all([
    prisma.$queryRaw<{ month: Date; occupied_room_nights: bigint }[]>`
      with nights as (
        select gs::date as night
        from bookings b
        join booking_rooms br on br.booking_id = b.id
        cross join lateral generate_series(b.check_in, b.check_out - interval '1 day', interval '1 day') as gs
        where b.status not in ${CANCELLED_STATUSES}
          and b.check_in < ${range.to} and b.check_out > ${range.from}
      )
      select date_trunc('month', night) as month, count(*)::bigint as occupied_room_nights
      from nights
      where night >= ${range.from} and night <= ${range.to}
      group by 1
      order by 1
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      select count(*)::bigint as count from rooms where status not in ${OUT_OF_SERVICE_STATUSES}
    `,
  ]);

  const sellableRooms = Number(sellableRoomsRows[0]?.count ?? 0);
  const occupiedByMonth = new Map(nightsRows.map((row) => [format(row.month, "yyyy-MM"), Number(row.occupied_room_nights)]));

  return eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => {
    const daysInMonth = differenceInCalendarDays(endOfMonth(month), startOfMonth(month)) + 1;
    const totalRoomNights = sellableRooms * daysInMonth;
    const occupied = occupiedByMonth.get(format(month, "yyyy-MM")) ?? 0;
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
  const rows = await prisma.$queryRaw<{ new_guests: bigint; returning_guests: bigint }[]>`
    with first_booking as (
      select customer_id, min(created_at) as first_at
      from bookings
      group by customer_id
    ),
    in_range_customers as (
      select distinct customer_id from bookings
      where created_at >= ${range.from} and created_at <= ${range.to}
        and status not in ${CANCELLED_STATUSES}
    )
    select
      count(*) filter (where fb.first_at >= ${range.from} and fb.first_at <= ${range.to})::bigint as new_guests,
      count(*) filter (where fb.first_at < ${range.from})::bigint as returning_guests
    from in_range_customers irc
    join first_booking fb on fb.customer_id = irc.customer_id
  `;

  const row = rows[0];
  return {
    newGuests: Number(row?.new_guests ?? 0),
    returningGuests: Number(row?.returning_guests ?? 0),
  };
}

export async function getPaymentMethodBreakdown(range: DateRange): Promise<PaymentMethodBreakdown> {
  const rows = await prisma.$queryRaw<{ payment_method: string; count: bigint }[]>`
    select payment_method, count(*)::bigint as count
    from bookings
    where created_at >= ${range.from} and created_at <= ${range.to}
      and status not in ${CANCELLED_STATUSES}
    group by 1
  `;

  const byMethod = new Map(rows.map((row) => [row.payment_method, Number(row.count)]));
  return {
    creditCard: byMethod.get("credit_card") ?? 0,
    cash: byMethod.get("cash") ?? 0,
  };
}

function formatSecondsOfDay(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Null (not "-") when there's simply no data yet — checked_in_at/
// checked_out_at only started being recorded once this dashboard shipped,
// so this is expected to be empty for a while on a fresh deployment.
export async function getCheckInOutAverages(): Promise<CheckInOutAverages> {
  const [checkInRows, checkOutRows] = await Promise.all([
    prisma.$queryRaw<{ avg_seconds: number | null }[]>`
      select avg(extract(epoch from checked_in_at::time))::float as avg_seconds
      from bookings where checked_in_at is not null
    `,
    prisma.$queryRaw<{ avg_seconds: number | null }[]>`
      select avg(extract(epoch from checked_out_at::time))::float as avg_seconds
      from bookings where checked_out_at is not null
    `,
  ]);

  const avgCheckInSeconds = checkInRows[0]?.avg_seconds ?? null;
  const avgCheckOutSeconds = checkOutRows[0]?.avg_seconds ?? null;

  return {
    avgCheckInTime: avgCheckInSeconds === null ? null : formatSecondsOfDay(avgCheckInSeconds),
    avgCheckOutTime: avgCheckOutSeconds === null ? null : formatSecondsOfDay(avgCheckOutSeconds),
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

// page_views only started being logged once this dashboard shipped, so
// there's no historical traffic to show until real visits accumulate —
// every bucket in range is still returned (zero-filled) so the chart
// renders a flat line instead of an empty one.
export async function getWebsiteTraffic(rangeKey: TrafficRangeKey): Promise<TrafficPoint[]> {
  const { from, bucket, labelFormat } = trafficRangeFor(rangeKey);
  const to = endOfDay(new Date());

  const rows =
    bucket === "hour"
      ? await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
          select date_trunc('hour', created_at) as bucket, count(*)::bigint as count
          from page_views
          where created_at >= ${from} and created_at <= ${to}
          group by 1 order by 1
        `
      : await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
          select date_trunc('day', created_at) as bucket, count(*)::bigint as count
          from page_views
          where created_at >= ${from} and created_at <= ${to}
          group by 1 order by 1
        `;

  const countByBucket = new Map(rows.map((row) => [row.bucket.toISOString(), Number(row.count)]));

  const points: TrafficPoint[] = [];
  const step = bucket === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  for (let t = from.getTime(); t <= to.getTime(); t += step) {
    const bucketDate = new Date(t);
    points.push({
      label: format(bucketDate, labelFormat),
      count: countByBucket.get(bucketDate.toISOString()) ?? 0,
    });
  }
  return points;
}
