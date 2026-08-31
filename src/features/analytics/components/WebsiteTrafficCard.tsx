"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { TrafficPoint } from "@/types/analytics";
import { PeriodDropdown } from "@/features/analytics/components/PeriodDropdown";
import { ErrorToast, useErrorMessage } from "@/features/analytics/components/ErrorToast";

const RANGE_OPTIONS: { key: string; label: string }[] = [
  { key: "realtime", label: "Real-time" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

export function WebsiteTrafficCard({
  initialData,
  pageOptions,
}: {
  initialData: TrafficPoint[];
  pageOptions: { key: string; label: string }[];
}) {
  const [range, setRange] = useState("realtime");
  const [page, setPage] = useState("all");
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useErrorMessage();

  async function refetch(nextRange: string, nextPage: string) {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/website-traffic?range=${nextRange}&page=${encodeURIComponent(nextPage)}`,
      );
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      console.error("[website-traffic] failed to refetch:", err);
      setError("Something went wrong, unable to provide details");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRangeChange(nextRange: string) {
    setRange(nextRange);
    refetch(nextRange, page);
  }

  function handlePageChange(nextPage: string) {
    setPage(nextPage);
    refetch(range, nextPage);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      {error && <ErrorToast message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-primary">Website traffic</h2>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodDropdown value={page} options={pageOptions} onChange={handlePageChange} />
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleRangeChange(option.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                range === option.key
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-border text-brand-body hover:bg-brand-surface-alt"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`h-56 w-full transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1e3ea" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8a93a3", fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(value) => [value, "Visits"]} />
            <Line type="monotone" dataKey="count" stroke="#bd5b28" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
