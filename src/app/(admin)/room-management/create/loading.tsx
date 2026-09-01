// ── CreateRoomLoading ────────────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ create-room-form.tsx (header + form field
// เดี่ยว + SelectField 3 อัน) โชว์หลัง spinner สั้นๆ ผ่าน DelayedLoadingState

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const FieldSkeleton = () => (
	<div className="flex flex-col gap-2">
		<div className="h-3.5 w-24 rounded bg-gray-200" />
		<div className="h-10 w-full rounded-[4px] bg-gray-200" />
	</div>
);

const CreateRoomLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full min-h-0 w-full flex-1 animate-pulse flex-col bg-[#F7F8FA]">
				<header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
					<div className="h-6 w-32 rounded bg-gray-200" />
					<div className="flex items-center gap-3">
						<div className="h-10 w-24 rounded-[4px] bg-gray-200" />
						<div className="h-10 w-24 rounded-[4px] bg-gray-200" />
					</div>
				</header>

				<div className="flex-1 overflow-y-auto px-10 py-8">
					<div className="flex max-w-[560px] flex-col gap-6">
						<FieldSkeleton />
						<FieldSkeleton />
						<FieldSkeleton />
						<FieldSkeleton />
					</div>
				</div>
			</div>
		}
	/>
);

export default CreateRoomLoading;
