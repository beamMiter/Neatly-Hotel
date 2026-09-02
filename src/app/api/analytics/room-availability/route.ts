import { NextResponse } from "next/server";
import { getRoomAvailabilityBreakdown, overviewRangeFor, type OverviewPeriodKey } from "@/server/queries/analytics.query";

const VALID_PERIODS: OverviewPeriodKey[] = ["month", "week", "today"];

export async function GET(request: Request) {
  const periodParam = new URL(request.url).searchParams.get("period");
  const period: OverviewPeriodKey = VALID_PERIODS.includes(periodParam as OverviewPeriodKey)
    ? (periodParam as OverviewPeriodKey)
    : "month";

  const data = await getRoomAvailabilityBreakdown(overviewRangeFor(period));
  return NextResponse.json({ data });
}
