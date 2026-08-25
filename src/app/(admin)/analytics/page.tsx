import type { Metadata } from "next";
import { startOfMonth, subMonths, endOfDay } from "date-fns";
import {
  getDashboardKpis,
  getRoomAvailabilityBreakdown,
  getBookingTrendsByDay,
  getRevenueTrend,
  getOccupancyTrend,
  getGuestVisitBreakdown,
  getPaymentMethodBreakdown,
  getCheckInOutAverages,
  getWebsiteTraffic,
} from "@/server/queries/analytics.query";
import { AnalyticsDashboardView } from "@/features/analytics/components/AnalyticsDashboardView";

export const metadata: Metadata = {
  title: "Analytics Dashboard | Neatly Hotel Admin",
};

export default async function AnalyticsPage() {
  const now = new Date();
  const thisMonth = { from: startOfMonth(now), to: endOfDay(now) };
  // Revenue/Occupancy default to the last 6 months, matching the mockup.
  const defaultFrom = startOfMonth(subMonths(now, 5));
  const defaultTo = endOfDay(now);
  const defaultRange = { from: defaultFrom, to: defaultTo };

  const [
    kpis,
    roomAvailability,
    bookingTrends,
    revenueTrend,
    occupancyTrend,
    guestVisit,
    paymentMethod,
    checkInOutAverages,
    websiteTraffic,
  ] = await Promise.all([
    getDashboardKpis(),
    getRoomAvailabilityBreakdown(thisMonth),
    getBookingTrendsByDay(thisMonth),
    getRevenueTrend(defaultRange),
    getOccupancyTrend(defaultRange),
    getGuestVisitBreakdown(defaultRange),
    getPaymentMethodBreakdown(defaultRange),
    getCheckInOutAverages(),
    getWebsiteTraffic("realtime"),
  ]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-2xl font-semibold text-brand-body">Analytics Dashboard</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <AnalyticsDashboardView
          data={{
            kpis,
            roomAvailability,
            bookingTrends,
            revenueTrend,
            occupancyTrend,
            guestVisit,
            paymentMethod,
            checkInOutAverages,
            websiteTraffic,
            defaultFrom,
            defaultTo,
          }}
        />
      </div>
    </div>
  );
}
