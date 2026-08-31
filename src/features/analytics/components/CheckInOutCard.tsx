import { BuildingIcon } from "@/components/icons/BuildingIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { ArrowRightIcon } from "@/components/icons/ArrowRightIcon";
import type { CheckInOutAverages } from "@/types/analytics";

// Matches the mockup exactly: check-in stays neutral (dark label/time, gray
// subtext, only the icon badge tinted green) while check-out is fully
// highlighted in the brand orange — label, time, and subtext all colored,
// not just the icon. That asymmetry is intentional in the source design,
// not a mismatch to normalize away. The check-out tint uses brand-primary
// at low opacity rather than Tailwind's stock orange scale, which reads too
// yellow next to this app's redder terracotta accent.
const TONE_STYLES = {
  in: {
    card: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    corner: "bg-emerald-700 text-white",
    label: "text-brand-body",
    time: "text-brand-ink",
    subtext: "text-brand-muted",
  },
  out: {
    card: "bg-brand-primary/10",
    badge: "bg-brand-primary/15 text-brand-primary",
    corner: "bg-brand-primary text-white",
    label: "text-brand-primary",
    time: "text-brand-primary",
    subtext: "text-brand-primary/80",
  },
} as const;

function Stat({
  label,
  time,
  subtext,
  tone,
}: {
  label: string;
  time: string | null;
  subtext: string;
  tone: "in" | "out";
}) {
  const styles = TONE_STYLES[tone];
  const CornerIcon = tone === "in" ? CheckIcon : ArrowRightIcon;

  return (
    <div className={`flex flex-1 items-center gap-4 rounded-lg border border-brand-border p-4 ${styles.card}`}>
      <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.badge}`}>
        <BuildingIcon className="h-6 w-6" />
        <span
          className={`absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${styles.corner}`}
        >
          <CornerIcon className="h-3 w-3" />
        </span>
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${styles.label}`}>{label}</span>
          <span className={`text-lg font-bold ${styles.time}`}>{time ?? "No data yet"}</span>
        </div>
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
          tone="in"
        />
        <Stat
          label="Check-out"
          time={averages.avgCheckOutTime}
          subtext={`Check-out time by ${checkOutTimeLabel}`}
          tone="out"
        />
      </div>
    </div>
  );
}
