"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { BookingTrendDay } from "@/types/analytics";
import { PeriodDropdown } from "@/features/analytics/components/PeriodDropdown";

type BookingTrendsPeriodKey = "month" | "last_month" | "last_2_months";

const PERIOD_OPTIONS: { key: BookingTrendsPeriodKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_2_months", label: "Last 2 months" },
];

export function BookingTrendsCard({ initialData }: { initialData: BookingTrendDay[] }) {
  const [period, setPeriod] = useState<BookingTrendsPeriodKey>("month");
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePeriodChange(nextPeriod: BookingTrendsPeriodKey) {
    setPeriod(nextPeriod);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/booking-trends?period=${nextPeriod}`);
      const json = await response.json();
      setData(json.data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Booking Trends by Day</h2>
        <PeriodDropdown value={period} options={PERIOD_OPTIONS} onChange={handlePeriodChange} />
      </div>

      <div className={`h-52 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1e3ea" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#8a93a3", fontSize: 12 }}
              tickFormatter={(value: number) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip formatter={(value) => [`${value}%`, "Share of bookings"]} />
            <Bar dataKey="percentage" fill="#bd5b28" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
