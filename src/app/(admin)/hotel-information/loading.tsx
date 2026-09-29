// ── HotelInformationLoading ──────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ hotel-information-view.tsx (header + field
// เดี่ยว + field คู่ + logo preview/upload box) โชว์หลัง spinner สั้นๆ ผ่าน
// DelayedLoadingState

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const FieldSkeleton = ({ className = '' }: { className?: string }) => (
	<div className={`flex flex-col gap-2 ${className}`}>
		<div className="h-3.5 w-24 rounded bg-gray-200" />
		<div className="h-10 w-full rounded-[4px] bg-gray-200" />
	</div>
);

const HotelInformationLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full min-h-0 w-full flex-1 animate-pulse flex-col bg-[#F7F8FA]">
				<header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
					<div className="h-6 w-44 rounded bg-gray-200" />
					<div className="h-10 w-28 rounded-[4px] bg-gray-200" />
				</header>

				<div className="flex-1 overflow-y-auto px-10 py-8">
					<div className="flex max-w-[720px] flex-col gap-6">
						<FieldSkeleton />
						<div className="flex gap-6">
							<FieldSkeleton className="flex-1" />
							<FieldSkeleton className="flex-1" />
						</div>
						<div className="flex gap-6">
							<div className="h-[88px] w-[240px] rounded-[4px] border border-[#E4E7EC] bg-white" />
							<div className="h-[167px] w-[167px] rounded-[4px] bg-gray-200" />
						</div>
					</div>
				</div>
			</div>
		}
	/>
);

export default HotelInformationLoading;
