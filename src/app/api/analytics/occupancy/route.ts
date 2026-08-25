import { NextResponse } from "next/server";
import { getOccupancyTrend, getGuestVisitBreakdown, getPaymentMethodBreakdown } from "@/server/queries/analytics.query";
import { parseDateRange } from "@/features/analytics/parse-date-range";

export async function GET(request: Request) {
  const range = parseDateRange(new URL(request.url).searchParams);
  const [occupancyTrend, guestVisit, paymentMethod] = await Promise.all([
    getOccupancyTrend(range),
    getGuestVisitBreakdown(range),
    getPaymentMethodBreakdown(range),
  ]);

  return NextResponse.json({ occupancyTrend, guestVisit, paymentMethod });
}
