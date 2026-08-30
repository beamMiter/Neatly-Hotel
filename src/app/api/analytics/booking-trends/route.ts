import { NextResponse } from "next/server";
import { getBookingTrendsByDay, bookingTrendsRangeFor, type BookingTrendsPeriodKey } from "@/server/queries/analytics.query";

const VALID_PERIODS: BookingTrendsPeriodKey[] = ["month", "last_month", "last_2_months"];

export async function GET(request: Request) {
  const periodParam = new URL(request.url).searchParams.get("period");
  const period: BookingTrendsPeriodKey = VALID_PERIODS.includes(periodParam as BookingTrendsPeriodKey)
    ? (periodParam as BookingTrendsPeriodKey)
    : "month";

  const data = await getBookingTrendsByDay(bookingTrendsRangeFor(period));
  return NextResponse.json({ data });
}
