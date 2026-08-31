"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { RoomAvailabilityBreakdown } from "@/types/analytics";
import { PeriodDropdown } from "@/features/analytics/components/PeriodDropdown";
import { ErrorToast, useErrorMessage } from "@/features/analytics/components/ErrorToast";

const COLORS = {
  occupied: "#bd5b28",
  booked: "#33413a",
  available: "#c9cfd6",
};

type OverviewPeriodKey = "month" | "week" | "today";

const PERIOD_OPTIONS: { key: OverviewPeriodKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
  { key: "today", label: "Today" },
];

export function RoomAvailabilityCard({ initialData }: { initialData: RoomAvailabilityBreakdown }) {
  const [period, setPeriod] = useState<OverviewPeriodKey>("month");
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useErrorMessage();

  async function handlePeriodChange(nextPeriod: OverviewPeriodKey) {
    setPeriod(nextPeriod);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/room-availability?period=${nextPeriod}`);
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      console.error("[room-availability] failed to refetch:", err);
      setError("Something went wrong, unable to provide details");
    } finally {
      setIsLoading(false);
    }
  }

  const total = data.occupied + data.booked + data.available;
  const segments = [
    { key: "occupied", label: "Occupied", value: data.occupied, color: COLORS.occupied },
    { key: "booked", label: "Booked", value: data.booked, color: COLORS.booked },
    { key: "available", label: "Available", value: data.available, color: COLORS.available },
  ];
  // Recharts draws nothing at all for a pie whose slices all sum to zero —
  // no ring, no placeholder, just blank space next to the legend. Swap in
  // a single neutral-gray full ring so "no data for this period" still
  // reads as a ring, not a layout gap.
  const pieData = total > 0 ? segments : [{ key: "empty", label: "No data", value: 1, color: "#d1d5db" }];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      {error && <ErrorToast message={error} />}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Room Availability</h2>
        <PeriodDropdown value={period} options={PERIOD_OPTIONS} onChange={handlePeriodChange} />
      </div>

      <div
        className={`flex flex-col items-center gap-4 transition-opacity sm:flex-row sm:gap-6 ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                innerRadius="65%"
                outerRadius="100%"
                paddingAngle={total > 0 ? 2 : 0}
              >
                {pieData.map((segment) => (
                  <Cell key={segment.key} fill={segment.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Side-by-side with a 160px donut left too little room for "22
            Rooms (35%)" on a phone-width card, wrapping only the widest
            row and looking broken next to the rows that fit. Stacking
            below sm gives the legend the card's full width instead. */}
        <ul className="flex flex-col gap-3 self-start">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2 whitespace-nowrap text-sm text-brand-body">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              <span>{segment.label}</span>
              <span className="font-medium text-brand-ink">
                {segment.value} Rooms
                {total > 0 && <span className="text-brand-muted"> ({Math.round((segment.value / total) * 100)}%)</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
