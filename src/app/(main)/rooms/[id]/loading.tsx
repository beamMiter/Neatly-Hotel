// ── RoomDetailLoading ─────────────────────────────────────────────────
// Skeleton shown while /rooms/[id] awaits room lookup (Supabase or mock data)
// แก้ไขได้: proportion ของแต่ละ block ให้ตรงกับ RoomDetail.tsx จริง

const RoomDetailLoading = () => {
	return (
		<div className="w-full animate-pulse bg-[#F7F7FB]">
			{/* ── Image slider ── */}
			<div className="w-full pt-10 lg:pt-16">
				<div className="flex flex-row gap-6 overflow-hidden px-6 sm:px-10 lg:mx-auto lg:max-w-232.5 lg:px-0">
					<div className="h-72 w-full flex-none rounded bg-gray-200 lg:h-145.25 lg:w-232.5" />
				</div>
			</div>

			{/* ── Detail ── */}
			<div className="mx-auto flex max-w-184.5 flex-col gap-20 px-6 py-16 sm:px-10 lg:px-0 lg:py-24">
				<div className="flex flex-col items-start gap-15">
					<div className="h-12 w-2/3 rounded bg-gray-200 lg:h-17" />

					<div className="flex w-full flex-col justify-between gap-15 lg:flex-row">
						<div className="flex flex-col gap-6">
							<div className="h-4 w-88.5 max-w-full rounded bg-gray-200" />
							<div className="h-4 w-70 max-w-full rounded bg-gray-200" />
							<div className="h-4 w-40 rounded bg-gray-200" />
						</div>

						<div className="flex flex-none flex-col items-end gap-4">
							<div className="h-4 w-24 rounded bg-gray-200" />
							<div className="h-6 w-32 rounded bg-gray-200" />
							<div className="h-12 w-36 rounded bg-gray-200" />
						</div>
					</div>
				</div>

				<div className="flex flex-col items-start gap-6 border-t border-[#E4E6ED] pt-10">
					<div className="h-6 w-40 rounded bg-gray-200" />
					<div className="flex w-full flex-col gap-2 lg:flex-row lg:gap-6">
						<div className="h-24 w-full rounded bg-gray-200 lg:w-77" />
						<div className="h-24 w-full rounded bg-gray-200 lg:w-77" />
					</div>
				</div>
			</div>

			{/* ── Other rooms ── */}
			<div className="w-full bg-[#E6EBE9] py-20 lg:py-26">
				<div className="mx-auto flex max-w-282 flex-col items-center gap-15 px-6 sm:px-10 lg:items-start lg:px-0">
					<div className="h-11 w-56 rounded bg-gray-300" />

					<div className="flex w-fit flex-row gap-6 overflow-hidden">
						<div className="h-85 w-85.5 flex-none rounded bg-gray-300 lg:w-137" />
						<div className="h-85 w-85.5 flex-none rounded bg-gray-300 lg:w-137" />
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomDetailLoading;
