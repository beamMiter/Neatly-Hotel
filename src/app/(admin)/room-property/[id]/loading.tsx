// ── EditRoomLoading ───────────────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ EditRoomForm.tsx (header + card ฟอร์มหลาย
// section, field เป็นคู่ grid-cols-2) โชว์หลัง spinner สั้นๆ ผ่าน
// DelayedLoadingState

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const FieldPair = () => (
	<div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
		<div className="flex flex-col gap-1.5">
			<div className="h-3.5 w-24 rounded bg-gray-200" />
			<div className="h-10 w-full rounded-md bg-gray-200" />
		</div>
		<div className="flex flex-col gap-1.5">
			<div className="h-3.5 w-24 rounded bg-gray-200" />
			<div className="h-10 w-full rounded-md bg-gray-200" />
		</div>
	</div>
);

const Section = () => (
	<section className="flex flex-col gap-5">
		<div className="h-4 w-32 rounded bg-gray-300" />
		<FieldPair />
		<FieldPair />
	</section>
);

const EditRoomLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full animate-pulse flex-col">
				<header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-md bg-gray-200" />
						<div className="h-6 w-40 rounded bg-gray-200" />
					</div>
					<div className="h-10 w-28 rounded-md bg-gray-200" />
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
					<div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-lg border border-brand-border bg-white p-8">
						<Section />
						<Section />
						<Section />
						<div className="flex justify-end">
							<div className="h-10 w-32 rounded-md bg-gray-200" />
						</div>
					</div>
				</div>
			</div>
		}
	/>
);

export default EditRoomLoading;
