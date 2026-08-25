import { CheckInIcon } from "@/components/icons/CheckInIcon";
import { CheckOutIcon } from "@/components/icons/CheckOutIcon";
import type { CheckInOutAverages } from "@/types/analytics";

function Stat({ label, time, icon: Icon, tone }: { label: string; time: string | null; icon: typeof CheckInIcon; tone: "in" | "out" }) {
  return (
    <div
      className={`flex flex-1 items-center gap-4 rounded-lg border border-brand-border p-4 ${
        tone === "in" ? "bg-emerald-50" : "bg-orange-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          tone === "in" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-brand-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-brand-body">{label}</span>
        <span className="text-lg font-semibold text-brand-ink">{time ?? "No data yet"}</span>
      </div>
    </div>
  );
}

export function CheckInOutCard({ averages }: { averages: CheckInOutAverages }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      <h2 className="text-sm font-semibold text-brand-primary">Check-in and Check-out Times Averages</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Stat label="Check-in" time={averages.avgCheckInTime} icon={CheckInIcon} tone="in" />
        <Stat label="Check-out" time={averages.avgCheckOutTime} icon={CheckOutIcon} tone="out" />
      </div>
    </div>
  );
}
