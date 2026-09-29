// ── BookingDetailLoading ─────────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ BookingDetailView.tsx (header + card
// field label/value เรียงกัน) โชว์หลัง spinner สั้นๆ ผ่าน DelayedLoadingState

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const FieldSkeleton = () => (
	<div className="flex flex-col gap-1.5">
		<div className="h-3 w-20 rounded bg-gray-200" />
		<div className="h-4 w-40 rounded bg-gray-200" />
	</div>
);

const BookingDetailLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full animate-pulse flex-col">
				<header className="flex items-center gap-3 border-b border-brand-border bg-white px-8 py-5">
					<div className="h-5 w-5 rounded bg-gray-200" />
					<div className="h-5 w-64 rounded bg-gray-200" />
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
					<div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-brand-border bg-white p-8">
						{Array.from({ length: 9 }).map((_, index) => (
							<FieldSkeleton key={index} />
						))}
						<div className="flex justify-end gap-3">
							<div className="h-10 w-28 rounded-md bg-gray-200" />
							<div className="h-10 w-28 rounded-md bg-gray-200" />
						</div>
					</div>
				</div>
			</div>
		}
	/>
);

export default BookingDetailLoading;
