"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { RevenuePoint } from "@/types/analytics";

function formatThb(amount: number) {
  return `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function RevenueTrendCard({ initialData, initialFrom, initialTo }: { initialData: RevenuePoint[]; initialFrom: Date; initialTo: Date }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(toDateInputValue(initialFrom));
  const [to, setTo] = useState(toDateInputValue(initialTo));
  const [isLoading, setIsLoading] = useState(false);

  async function refetch(nextFrom: string, nextTo: string) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/revenue-trend?from=${nextFrom}&to=${nextTo}`);
      const json = await response.json();
      setData(json.data);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFromChange(value: string) {
    setFrom(value);
    refetch(value, to);
  }

  function handleToChange(value: string) {
    setTo(value);
    refetch(from, value);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Revenue Trend</h2>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-brand-muted">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => handleFromChange(event.target.value)}
              className="rounded-md border border-brand-border px-2 py-1 text-xs text-brand-body"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-brand-muted">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => handleToChange(event.target.value)}
              className="rounded-md border border-brand-border px-2 py-1 text-xs text-brand-body"
            />
          </label>
          <a
            href={`/api/analytics/revenue-trend/export?from=${from}&to=${to}`}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            Export
          </a>
        </div>
      </div>

      <div className={`h-64 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
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
      </div>
    </div>
  );
}
