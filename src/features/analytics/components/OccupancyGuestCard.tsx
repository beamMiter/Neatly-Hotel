"use client";

import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from "recharts";
import type { OccupancyPoint, OccupancyByRoomTypeSeries, GuestVisitBreakdown, PaymentMethodBreakdown } from "@/types/analytics";
import { DateField } from "@/features/analytics/components/DateField";
import { PeriodDropdown } from "@/features/analytics/components/PeriodDropdown";
import { ExportButton } from "@/features/analytics/components/ExportButton";
import { CreditCardIcon } from "@/components/icons/CreditCardIcon";
import { CashIcon } from "@/components/icons/CashIcon";

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

// Validated 8-hue categorical palette (dataviz skill's documented default —
// see references/palette.md), fixed order, never cycled. Room types beyond
// the 8th fold into a single "Other" series (see getOccupancyTrendByRoomType)
// rendered in this muted gray instead of a 9th generated hue.
const ROOM_TYPE_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER_COLOR = "#898781";

function colorForRoomType(name: string, index: number) {
  return name === "Other" ? OTHER_COLOR : ROOM_TYPE_PALETTE[index % ROOM_TYPE_PALETTE.length];
}

type ViewByKey = "overall" | "room_types";

const VIEW_BY_OPTIONS: { key: ViewByKey; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "room_types", label: "Room types" },
];

function ShareBar({
  label,
  value,
  total,
  color,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon?: ReactNode;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-surface-alt text-brand-primary">
          {icon}
        </span>
      )}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-brand-body">
          <span>
            {label} <span className="text-brand-muted">{value.toLocaleString("en-US")} people</span>
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-surface-alt">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

type OccupancyGuestData = {
  occupancyTrend: OccupancyPoint[];
  occupancyByRoomType: OccupancyByRoomTypeSeries;
  guestVisit: GuestVisitBreakdown;
  paymentMethod: PaymentMethodBreakdown;
};

export function OccupancyGuestCard({ initialData, initialFrom, initialTo }: { initialData: OccupancyGuestData; initialFrom: Date; initialTo: Date }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [viewBy, setViewBy] = useState<ViewByKey>("overall");
  const [isLoading, setIsLoading] = useState(false);

  async function refetch(nextFrom: Date, nextTo: Date) {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/occupancy?from=${toDateInputValue(nextFrom)}&to=${toDateInputValue(nextTo)}`,
      );
      setData(await response.json());
    } finally {
      setIsLoading(false);
    }
  }

  const totalGuests = data.guestVisit.newGuests + data.guestVisit.returningGuests;
  const totalPayments = data.paymentMethod.creditCard + data.paymentMethod.cash;
  const roomTypeChartData = data.occupancyByRoomType.points.map((point) => ({ month: point.month, ...point.rates }));

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-brand-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Occupancy & Guest</h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-muted">View by</span>
          <PeriodDropdown value={viewBy} options={VIEW_BY_OPTIONS} onChange={setViewBy} />
          <DateField
            label="From"
            value={from}
            max={to}
            onChange={(date) => {
              setFrom(date);
              refetch(date, to);
            }}
          />
          <DateField
            label="To"
            value={to}
            min={from}
            onChange={(date) => {
              setTo(date);
              refetch(from, date);
            }}
          />
          <ExportButton
            href={`/api/analytics/occupancy/export?from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
            fileName="occupancy-trend.csv"
          />
        </div>
      </div>

      <div className={`h-60 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <p className="mb-1 text-xs text-brand-muted">Occupancy Rate</p>
        <ResponsiveContainer width="100%" height="100%">
          {viewBy === "overall" ? (
            <LineChart data={data.occupancyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e3ea" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8a93a3", fontSize: 12 }}
                tickFormatter={(value: number) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip formatter={(value) => [`${value}%`, "Occupancy"]} />
              <Line type="monotone" dataKey="ratePct" stroke="#bd5b28" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={roomTypeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="#e1e3ea" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8a93a3", fontSize: 12 }}
                tickFormatter={(value: number) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip formatter={(value) => [`${value}%`, undefined]} />
              <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12 }} />
              {data.occupancyByRoomType.seriesNames.map((name, index) => (
                <Bar key={name} dataKey={name} fill={colorForRoomType(name, index)} radius={[4, 4, 0, 0]} maxBarSize={16} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 border-t border-brand-border pt-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-brand-muted">Guest Visit</h3>
          <ShareBar label="New guests" value={data.guestVisit.newGuests} total={totalGuests} color="#bd5b28" />
          <ShareBar label="Returning guests" value={data.guestVisit.returningGuests} total={totalGuests} color="#33413a" />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-brand-muted">Payment Method</h3>
          <ShareBar
            label="Credit card"
            value={data.paymentMethod.creditCard}
            total={totalPayments}
            color="#bd5b28"
            icon={<CreditCardIcon className="h-4 w-4" />}
          />
          <ShareBar
            label="Cash"
            value={data.paymentMethod.cash}
            total={totalPayments}
            color="#33413a"
            icon={<CashIcon className="h-4 w-4" />}
          />
        </div>
      </div>
    </div>
  );
}
