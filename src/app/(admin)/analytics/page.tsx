import type { Metadata } from "next";
import { startOfMonth, subMonths, endOfDay } from "date-fns";
import {
  getDashboardKpis,
  getRoomAvailabilityBreakdown,
  getBookingTrendsByDay,
  getRevenueTrend,
  getOccupancyTrend,
  getOccupancyTrendByRoomType,
  getGuestVisitBreakdown,
  getPaymentMethodBreakdown,
  getCheckInOutAverages,
  getWebsiteTraffic,
  getWebsiteTrafficPages,
  overviewRangeFor,
} from "@/server/queries/analytics.query";
import { AnalyticsDashboardView } from "@/features/analytics/components/AnalyticsDashboardView";
import { loadHotelInformation } from "@/server/queries/hotel.query";
import { formatCheckTimeLabel } from "@/types/hotel";

export const metadata: Metadata = {
  title: "Analytics Dashboard | Neatly Hotel Admin",
};

export default async function AnalyticsPage() {
  const now = new Date();
  const thisMonth = overviewRangeFor("month");
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
    occupancyByRoomType,
    guestVisit,
    paymentMethod,
    checkInOutAverages,
    websiteTraffic,
    websiteTrafficPages,
    hotel,
  ] = await Promise.all([
    getDashboardKpis(),
    getRoomAvailabilityBreakdown(thisMonth),
    getBookingTrendsByDay(thisMonth),
    getRevenueTrend(defaultRange),
    getOccupancyTrend(defaultRange),
    getOccupancyTrendByRoomType(defaultRange),
    getGuestVisitBreakdown(defaultRange),
    getPaymentMethodBreakdown(defaultRange),
    getCheckInOutAverages(),
    getWebsiteTraffic("realtime"),
    getWebsiteTrafficPages(),
    loadHotelInformation(),
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
            occupancyByRoomType,
            guestVisit,
            paymentMethod,
            checkInOutAverages,
            websiteTraffic,
            websiteTrafficPages,
            checkInTimeLabel: formatCheckTimeLabel(hotel.checkInTime),
            checkOutTimeLabel: formatCheckTimeLabel(hotel.checkOutTime),
            defaultFrom,
            defaultTo,
          }}
        />
      </div>
    </div>
  );
}
