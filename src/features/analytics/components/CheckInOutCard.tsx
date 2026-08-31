import { CheckInIcon } from "@/components/icons/CheckInIcon";
import { CheckOutIcon } from "@/components/icons/CheckOutIcon";
import type { CheckInOutAverages } from "@/types/analytics";

// Both tones use the same light-badge / dark-glyph treatment — only the hue
// (emerald vs orange) differs — so neither side reads as a mismatched
// one-off. "out" reuses the dashboard's single brand-orange accent rather
// than a separate red, for the same reason.
const TONE_STYLES = {
  in: { card: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", subtext: "text-emerald-700/70" },
  out: { card: "bg-orange-50", badge: "bg-orange-100 text-brand-primary", subtext: "text-brand-primary/70" },
} as const;

function Stat({
  label,
  time,
  subtext,
  icon: Icon,
  tone,
}: {
  label: string;
  time: string | null;
  subtext: string;
  icon: typeof CheckInIcon;
  tone: "in" | "out";
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`flex flex-1 items-center gap-4 rounded-lg border border-brand-border p-4 ${styles.card}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.badge}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-brand-body">{label}</span>
        <span className="text-lg font-semibold text-brand-ink">{time ?? "No data yet"}</span>
        <span className={`text-xs ${styles.subtext}`}>{subtext}</span>
      </div>
    </div>
  );
}

export function CheckInOutCard({
  averages,
  checkInTimeLabel,
  checkOutTimeLabel,
}: {
  averages: CheckInOutAverages;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
      <h2 className="text-sm font-semibold text-brand-primary">Check-in and Check-out Times Averages</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Stat
          label="Check-in"
          time={averages.avgCheckInTime}
          subtext={`Check-in time from ${checkInTimeLabel} onwards`}
          icon={CheckInIcon}
          tone="in"
        />
        <Stat
          label="Check-out"
          time={averages.avgCheckOutTime}
          subtext={`Check-out time by ${checkOutTimeLabel}`}
          icon={CheckOutIcon}
          tone="out"
        />
      </div>
    </div>
  );
}
