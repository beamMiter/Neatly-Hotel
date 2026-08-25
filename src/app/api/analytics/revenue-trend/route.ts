import { NextResponse } from "next/server";
import { getRevenueTrend } from "@/server/queries/analytics.query";
import { parseDateRange } from "@/features/analytics/parse-date-range";

export async function GET(request: Request) {
  const range = parseDateRange(new URL(request.url).searchParams);
  const data = await getRevenueTrend(range);
  return NextResponse.json({ data });
}
