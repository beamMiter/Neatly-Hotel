// ── CustomerBookingLoading ───────────────────────────────────────────
// Skeleton ตรงกับ layout จริงของ CustomerBookingsTable.tsx (header + table 8
// คอลัมน์ + pagination) โชว์หลัง spinner สั้นๆ ผ่าน DelayedLoadingState
// แก้ไขได้: ROW_COUNT

import DelayedLoadingState from '@/components/shared/DelayedLoadingState';

const ROW_COUNT = 8;
const COLUMNS = ['Customer name', 'Guest(s)', 'Room type', 'Amount', 'Bed Type', 'Check-in', 'Check-out', 'Status'];

const CustomerBookingLoading = () => (
	<DelayedLoadingState
		skeleton={
			<div className="flex h-full animate-pulse flex-col">
				<header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
					<div className="h-7 w-52 rounded bg-gray-200" />
					<div className="h-10 w-60 rounded-md bg-gray-200" />
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
					<div className="overflow-hidden rounded-lg border border-brand-border bg-white">
						<table className="w-full min-w-[960px] text-left text-sm">
							<thead>
								<tr className="bg-brand-surface-alt">
									{COLUMNS.map((column) => (
										<th key={column} className="px-6 py-3">
											<div className="h-3 w-16 rounded bg-gray-300" />
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{Array.from({ length: ROW_COUNT }).map((_, index) => (
									<tr key={index} className="border-b border-brand-border last:border-0">
										{COLUMNS.map((column) => (
											<td key={column} className="px-6 py-4">
												<div className="h-3.5 w-16 rounded bg-gray-200" />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex items-center justify-center gap-2.5 border-t border-brand-border bg-white py-4">
					<div className="h-8 w-8 rounded-md bg-gray-200" />
					<div className="h-8 w-8 rounded-md bg-gray-200" />
					<div className="h-8 w-8 rounded-md bg-gray-200" />
				</div>
			</div>
		}
	/>
);

export default CustomerBookingLoading;
