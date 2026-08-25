import { CartIcon } from "@/components/icons/CartIcon";
import { BagIcon } from "@/components/icons/BagIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { GlobeIcon } from "@/components/icons/GlobeIcon";
import { TrendIcon } from "@/components/icons/TrendIcon";
import type { DashboardKpis, KpiMetric } from "@/types/analytics";

function formatThb(amount: number) {
  return `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function ChangeIndicator({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return <span className="text-xs text-brand-muted">No data last month</span>;
  }

  const isUp = changePct >= 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
      <TrendIcon className={`h-3 w-3 ${isUp ? "" : "rotate-180"}`} />
      {Math.abs(changePct).toFixed(1)}% from last month
    </span>
  );
}

type CardConfig = {
  label: string;
  icon: typeof CartIcon;
  metric: KpiMetric;
  format: (value: number) => string;
};

export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  const cards: CardConfig[] = [
    { label: "Total booking", icon: CartIcon, metric: kpis.totalBookings, format: (value) => value.toLocaleString("en-US") },
    { label: "Total sales", icon: BagIcon, metric: kpis.totalSales, format: formatThb },
    { label: "Total booking users", icon: UsersIcon, metric: kpis.totalBookingUsers, format: (value) => value.toLocaleString("en-US") },
    { label: "Total site visitors", icon: GlobeIcon, metric: kpis.totalSiteVisitors, format: (value) => value.toLocaleString("en-US") },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col gap-3 rounded-lg border border-brand-border bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-muted">{card.label}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-surface-alt text-brand-primary">
              <card.icon className="h-4 w-4" />
            </span>
          </div>
          <span className="text-2xl font-semibold text-brand-ink">{card.format(card.metric.value)}</span>
          <ChangeIndicator changePct={card.metric.changePct} />
        </div>
      ))}
    </div>
  );
}
