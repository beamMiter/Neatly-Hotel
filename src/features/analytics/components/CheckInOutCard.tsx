import { CheckInIcon } from "@/components/icons/CheckInIcon";
import { CheckOutIcon } from "@/components/icons/CheckOutIcon";
import type { CheckInOutAverages } from "@/types/analytics";

// Matches the mockup exactly: check-in stays neutral (dark label/time, gray
// subtext, only the icon badge tinted green) while check-out is fully
// highlighted in the brand orange — label, time, and subtext all colored,
// not just the icon. That asymmetry is intentional in the source design,
// not a mismatch to normalize away.
const TONE_STYLES = {
  in: {
    card: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    label: "text-brand-body",
    time: "text-brand-ink",
    subtext: "text-brand-muted",
  },
  out: {
    card: "bg-orange-50",
    badge: "bg-orange-100 text-brand-primary",
    label: "text-brand-primary",
    time: "text-brand-primary",
    subtext: "text-brand-primary/80",
  },
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
        <span className={`text-sm font-medium ${styles.label}`}>{label}</span>
        <span className={`text-lg font-semibold ${styles.time}`}>{time ?? "No data yet"}</span>
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
