// ── RoomManagementLoading ────────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ room-management-view.tsx (header + table
// การ์ดขาว + pagination) โชว์หลัง spinner สั้นๆ ผ่าน DelayedLoadingState
// แก้ไขได้: ROW_COUNT

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const ROW_COUNT = 8;

const RoomManagementLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full min-h-0 w-full flex-1 animate-pulse flex-col bg-[#F7F8FA]">
				<header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
					<div className="h-6 w-44 rounded bg-gray-200" />
					<div className="flex items-center gap-3">
						<div className="h-10 w-60 rounded-[4px] bg-gray-200" />
						<div className="h-10 w-32 rounded-[4px] bg-gray-200" />
					</div>
				</header>

				<div className="flex min-h-0 flex-1 flex-col px-10 pt-6 pb-8">
					<div className="min-h-0 flex-1 overflow-hidden rounded-[4px] bg-white">
						<div className="h-12 bg-[#E9ECF1]" />

						{Array.from({ length: ROW_COUNT }).map((_, index) => (
							<div key={index} className="flex min-h-16 items-center border-b border-[#F0F1F5] px-6 last:border-b-0">
								<div className="w-[14%] pr-6">
									<div className="h-3.5 w-16 rounded bg-gray-200" />
								</div>
								<div className="w-[30%] pr-6">
									<div className="h-3.5 w-32 rounded bg-gray-200" />
								</div>
								<div className="w-[22%] pr-6">
									<div className="h-3.5 w-20 rounded bg-gray-200" />
								</div>
								<div className="w-[24%] pr-6">
									<div className="h-8 w-28 rounded bg-gray-200" />
								</div>
								<div className="flex w-[10%] justify-center">
									<div className="h-8 w-8 rounded-[4px] bg-gray-200" />
								</div>
							</div>
						))}
					</div>

					<div className="mt-6 flex shrink-0 items-center justify-center gap-2.5">
						<div className="h-8 w-8 rounded-[4px] bg-gray-200" />
						<div className="h-8 w-8 rounded-[4px] bg-gray-200" />
						<div className="h-8 w-8 rounded-[4px] bg-gray-200" />
						<div className="h-8 w-8 rounded-[4px] bg-gray-200" />
					</div>
				</div>
			</div>
		}
	/>
);

export default RoomManagementLoading;
