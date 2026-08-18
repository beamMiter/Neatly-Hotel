// ── RoomsGuestsPicker ─────────────────────────────────────────────────
// Rooms & Guests field — dropdown with +/- counters for room/guest count
// แก้ไขได้: MIN_COUNT, label format — ยังไม่เช็ค capacity จริง (rough mock ก่อน)

'use client';

import { useState } from 'react';

// ── Data ───────────────────────────────────────────────────────
const MIN_COUNT = 1;

// ── Sub components ────────────────────────────────────────────
const DropdownIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 flex-none">
		<path d="M5 7.5L10 12.5L15 7.5" stroke="#9AA1B9" strokeWidth="1.5" />
	</svg>
);

const MinusIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 flex-none">
		<circle cx="10" cy="10" r="9.25" stroke="#E76B39" strokeWidth="1.5" />
		<path d="M6 10H14" stroke="#E76B39" strokeWidth="1.5" />
	</svg>
);

const PlusIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 flex-none">
		<circle cx="10" cy="10" r="9.25" stroke="#E76B39" strokeWidth="1.5" />
		<path d="M6 10H14M10 6V14" stroke="#E76B39" strokeWidth="1.5" />
	</svg>
);

// ── Types ──────────────────────────────────────────────────────
type CounterRowProps = {
	label: string;
	count: number;
	onDecrease: () => void;
	onIncrease: () => void;
};

// ── Sub components ────────────────────────────────────────────
const CounterRow = ({ label, count, onDecrease, onIncrease }: CounterRowProps) => (
	<div className="flex h-10 w-full items-center px-4 py-2">
		<span className="flex-1 [font-family:var(--font-inter)] text-base text-[#646D89]">{label}</span>
		<div className="flex w-19.5 items-center justify-between gap-1">
			<button
				type="button"
				onClick={onDecrease}
				disabled={count <= MIN_COUNT}
				className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 hover:bg-gray-100 active:scale-90 disabled:opacity-40 disabled:hover:bg-transparent"
			>
				<MinusIcon />
			</button>
			<span className="mx-auto [font-family:var(--font-inter)] text-base text-[#646D89]">{count}</span>
			<button
				type="button"
				onClick={onIncrease}
				className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 hover:bg-gray-100 active:scale-90"
			>
				<PlusIcon />
			</button>
		</div>
	</div>
);

// ── Component ──────────────────────────────────────────────────
const RoomsGuestsPicker = () => {
	const [rooms, setRooms] = useState(1);
	const [guests, setGuests] = useState(2);
	const [isOpen, setIsOpen] = useState(false);

	const summary = `${rooms} room${rooms > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}`;

	return (
		<div className="relative flex w-full flex-col items-start gap-1 lg:w-60">
			<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Rooms & Guests</span>

			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 lg:w-60"
			>
				<span className="flex-1 text-left [font-family:var(--font-inter)] text-base text-[#9AA1B9]">{summary}</span>
				<DropdownIcon />
			</button>

			{isOpen && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

					<div className="absolute top-full left-0 z-20 mt-2 flex w-60 flex-col gap-1.5 rounded bg-white py-2 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] animate-[dropdown-in_150ms_ease-out]">
						<CounterRow
							label="Room"
							count={rooms}
							onDecrease={() => setRooms((prev) => Math.max(MIN_COUNT, prev - 1))}
							onIncrease={() => setRooms((prev) => prev + 1)}
						/>
						<CounterRow
							label="Guest"
							count={guests}
							onDecrease={() => setGuests((prev) => Math.max(MIN_COUNT, prev - 1))}
							onIncrease={() => setGuests((prev) => prev + 1)}
						/>
					</div>
				</>
			)}
		</div>
	);
};

export default RoomsGuestsPicker;
