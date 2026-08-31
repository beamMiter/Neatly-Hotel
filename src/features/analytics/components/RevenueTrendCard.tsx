"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { RevenuePoint } from "@/types/analytics";
import { DateField } from "@/features/analytics/components/DateField";
import { ExportButton } from "@/features/analytics/components/ExportButton";
import { ErrorToast, useErrorMessage } from "@/features/analytics/components/ErrorToast";
import { TouchTooltipChart } from "@/features/analytics/components/TouchTooltipChart";

function formatThb(amount: number) {
  return `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function RevenueTrendCard({ initialData, initialFrom, initialTo }: { initialData: RevenuePoint[]; initialFrom: Date; initialTo: Date }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useErrorMessage();

  async function refetch(nextFrom: Date, nextTo: Date) {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/revenue-trend?from=${toDateInputValue(nextFrom)}&to=${toDateInputValue(nextTo)}`,
      );
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      console.error("[revenue-trend] failed to refetch:", err);
      setError("Something went wrong, unable to provide details");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFromChange(date: Date) {
    setFrom(date);
    refetch(date, to);
  }

  function handleToChange(date: Date) {
    setTo(date);
    refetch(from, date);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      {error && <ErrorToast message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Revenue Trend</h2>

        {/* Export stays on the title's row at every width; From/To take
            their own full-width row below it on mobile (only enough room
            for one row's worth of controls there) and fall back in next to
            Export at lg+ where the title row has space for all of it. */}
        <div className="order-2 lg:order-3">
          <ExportButton
            href={`/api/analytics/revenue-trend/export?from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
            fileName="revenue-trend.csv"
          />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-2 lg:order-2 lg:w-auto">
          <DateField label="From" value={from} max={to} onChange={handleFromChange} />
          <DateField label="To" value={to} min={from} onChange={handleToChange} />
        </div>
      </div>

      <div className={`h-64 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <TouchTooltipChart>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bd5b28" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#bd5b28" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e1e3ea" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8a93a3", fontSize: 12 }}
                tickFormatter={(value: number) => value.toLocaleString("en-US")}
              />
              <Tooltip formatter={(value) => [formatThb(Number(value)), "Revenue"]} />
              <Area type="monotone" dataKey="amount" stroke="#bd5b28" strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </TouchTooltipChart>
      </div>
    </div>
  );
}
