import { KpiCards } from "@/features/analytics/components/KpiCards";
import { RoomAvailabilityCard } from "@/features/analytics/components/RoomAvailabilityCard";
import { BookingTrendsCard } from "@/features/analytics/components/BookingTrendsCard";
import { RevenueTrendCard } from "@/features/analytics/components/RevenueTrendCard";
import { OccupancyGuestCard } from "@/features/analytics/components/OccupancyGuestCard";
import { CheckInOutCard } from "@/features/analytics/components/CheckInOutCard";
import { WebsiteTrafficCard } from "@/features/analytics/components/WebsiteTrafficCard";
import type {
  DashboardKpis,
  RoomAvailabilityBreakdown,
  BookingTrendDay,
  RevenuePoint,
  OccupancyPoint,
  OccupancyByRoomTypeSeries,
  GuestVisitBreakdown,
  PaymentMethodBreakdown,
  CheckInOutAverages,
  TrafficPoint,
} from "@/types/analytics";

export type AnalyticsDashboardData = {
  kpis: DashboardKpis;
  roomAvailability: RoomAvailabilityBreakdown;
  bookingTrends: BookingTrendDay[];
  revenueTrend: RevenuePoint[];
  occupancyTrend: OccupancyPoint[];
  occupancyByRoomType: OccupancyByRoomTypeSeries;
  guestVisit: GuestVisitBreakdown;
  paymentMethod: PaymentMethodBreakdown;
  checkInOutAverages: CheckInOutAverages;
  websiteTraffic: TrafficPoint[];
  websiteTrafficPages: { key: string; label: string }[];
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
  defaultFrom: Date;
  defaultTo: Date;
};

export function AnalyticsDashboardView({ data }: { data: AnalyticsDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <KpiCards kpis={data.kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RoomAvailabilityCard initialData={data.roomAvailability} />
        <BookingTrendsCard initialData={data.bookingTrends} />
      </div>

      <RevenueTrendCard initialData={data.revenueTrend} initialFrom={data.defaultFrom} initialTo={data.defaultTo} />

      <OccupancyGuestCard
        initialData={{
          occupancyTrend: data.occupancyTrend,
          occupancyByRoomType: data.occupancyByRoomType,
          guestVisit: data.guestVisit,
          paymentMethod: data.paymentMethod,
        }}
        initialFrom={data.defaultFrom}
        initialTo={data.defaultTo}
      />

      <CheckInOutCard
        averages={data.checkInOutAverages}
        checkInTimeLabel={data.checkInTimeLabel}
        checkOutTimeLabel={data.checkOutTimeLabel}
      />

      <WebsiteTrafficCard initialData={data.websiteTraffic} pageOptions={data.websiteTrafficPages} />
    </div>
  );
}
