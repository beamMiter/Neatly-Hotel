// ── SearchLoading ─────────────────────────────────────────────────────
// Skeleton shown while /search awaits searchRoomTypes() from Supabase
// แก้ไขได้: จำนวนการ์ด skeleton (CARD_COUNT), proportion ของแต่ละ block

const CARD_COUNT = 3;

const SearchLoading = () => {
	return (
		<main className="flex-1 bg-brand-surface">
			<div className="sticky top-0 z-30 bg-white">
				<div className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
					<div className="h-16 w-full animate-pulse rounded bg-gray-200" />
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 sm:px-8">
				{Array.from({ length: CARD_COUNT }).map((_, index) => (
					<div
						key={index}
						className="grid animate-pulse gap-6 border-b border-brand-border py-8 lg:grid-cols-[minmax(280px,2fr)_minmax(0,3fr)] lg:gap-10"
					>
						<div className="aspect-16/10 w-full rounded bg-gray-200 lg:min-h-55" />

						<div className="flex min-w-0 flex-col gap-4">
							<div className="h-8 w-2/3 rounded bg-gray-200" />
							<div className="h-4 w-1/2 rounded bg-gray-200" />
							<div className="h-4 w-full rounded bg-gray-200" />
							<div className="h-4 w-5/6 rounded bg-gray-200" />

							<div className="mt-auto flex items-center justify-end gap-6 pt-6">
								<div className="h-4 w-24 rounded bg-gray-200" />
								<div className="h-11 w-28 rounded bg-gray-200" />
							</div>
						</div>
					</div>
				))}
			</div>
		</main>
	);
};

export default SearchLoading;
