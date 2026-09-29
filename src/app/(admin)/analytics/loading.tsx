// ── AnalyticsLoading ─────────────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ AnalyticsDashboardView.tsx (KPI 4-col grid
// → chart card คู่ 2-col → chart card เต็มความกว้าง 4 อัน) โชว์หลัง spinner
// สั้นๆ ผ่าน DelayedLoadingState

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const KpiCardSkeleton = () => (
	<div className="flex flex-col gap-3 rounded-lg border border-brand-border bg-white p-5">
		<div className="flex items-center justify-between">
			<div className="h-3.5 w-20 rounded bg-gray-200" />
			<div className="h-4 w-4 rounded bg-gray-200" />
		</div>
		<div className="h-7 w-24 rounded bg-gray-300" />
	</div>
);

const ChartCardSkeleton = ({ heightClass = 'h-64' }: { heightClass?: string }) => (
	<div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-white p-5">
		<div className="flex items-center justify-between">
			<div className="h-4 w-40 rounded bg-gray-200" />
			<div className="h-8 w-28 rounded-md bg-gray-200" />
		</div>
		<div className={`w-full rounded bg-gray-100 ${heightClass}`} />
	</div>
);

const AnalyticsLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full animate-pulse flex-col">
				<header className="border-b border-brand-border bg-white px-8 py-5">
					<div className="h-7 w-56 rounded bg-gray-200" />
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
					<div className="flex flex-col gap-6">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<KpiCardSkeleton />
							<KpiCardSkeleton />
							<KpiCardSkeleton />
							<KpiCardSkeleton />
						</div>

						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<ChartCardSkeleton />
							<ChartCardSkeleton />
						</div>

						<ChartCardSkeleton heightClass="h-72" />
						<ChartCardSkeleton heightClass="h-72" />
						<ChartCardSkeleton heightClass="h-48" />
						<ChartCardSkeleton heightClass="h-64" />
					</div>
				</div>
			</div>
		}
	/>
);

export default AnalyticsLoading;
