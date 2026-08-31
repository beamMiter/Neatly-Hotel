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

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      {error && <ErrorToast message={error} />}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Room Availability</h2>
        <PeriodDropdown value={period} options={PERIOD_OPTIONS} onChange={handlePeriodChange} />
      </div>

      <div className={`flex items-center gap-6 transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={segments} dataKey="value" nameKey="label" innerRadius="65%" outerRadius="100%" paddingAngle={2}>
                {segments.map((segment) => (
                  <Cell key={segment.key} fill={segment.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex flex-col gap-3">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2 text-sm text-brand-body">
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
