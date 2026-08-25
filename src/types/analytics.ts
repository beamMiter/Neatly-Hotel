// Return types for src/server/queries/analytics.query.ts.

export type KpiMetric = {
  value: number;
  changePct: number | null; // null when there's no prior-month value to compare against
};

export type DashboardKpis = {
  totalBookings: KpiMetric;
  totalSales: KpiMetric;
  totalBookingUsers: KpiMetric;
  totalSiteVisitors: KpiMetric;
};

export type RoomAvailabilityBreakdown = {
  occupied: number;
  booked: number;
  available: number;
};

export type BookingTrendDay = {
  day: string; // "Mon".."Sun"
  percentage: number; // this day's share of total bookings in the range, 0-100
};

export type RevenuePoint = {
  month: string; // "January", ...
  amount: number;
};

export type OccupancyPoint = {
  month: string;
  ratePct: number;
};

export type GuestVisitBreakdown = {
  newGuests: number;
  returningGuests: number;
};

export type PaymentMethodBreakdown = {
  creditCard: number;
  cash: number;
};

export type CheckInOutAverages = {
  avgCheckInTime: string | null; // formatted "4:03 PM", null if no data yet
  avgCheckOutTime: string | null;
};

export type TrafficPoint = {
  label: string;
  count: number;
};

export type DateRange = {
  from: Date;
  to: Date;
};
