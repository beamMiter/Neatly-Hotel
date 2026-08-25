"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { BookingTrendDay } from "@/types/analytics";

export function BookingTrendsCard({ data }: { data: BookingTrendDay[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      <h2 className="text-sm font-semibold text-brand-primary">Booking Trends by Day</h2>

      <div className="h-52 w-full">
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
