"use client";

import { useState } from "react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { OccupancyPoint, GuestVisitBreakdown, PaymentMethodBreakdown } from "@/types/analytics";
import { DateField } from "@/features/analytics/components/DateField";

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function ShareBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
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
  );
}

type OccupancyGuestData = {
  occupancyTrend: OccupancyPoint[];
  guestVisit: GuestVisitBreakdown;
  paymentMethod: PaymentMethodBreakdown;
};

export function OccupancyGuestCard({ initialData, initialFrom, initialTo }: { initialData: OccupancyGuestData; initialFrom: Date; initialTo: Date }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
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

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-brand-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Occupancy & Guest</h2>

        <div className="flex flex-wrap items-center gap-2">
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
          <a
            href={`/api/analytics/occupancy/export?from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            Export
          </a>
        </div>
      </div>

      <div className={`h-52 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <p className="mb-1 text-xs text-brand-muted">Occupancy Rate</p>
        <ResponsiveContainer width="100%" height="100%">
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
          <ShareBar label="Credit card" value={data.paymentMethod.creditCard} total={totalPayments} color="#bd5b28" />
          <ShareBar label="Cash" value={data.paymentMethod.cash} total={totalPayments} color="#33413a" />
        </div>
      </div>
    </div>
  );
}
