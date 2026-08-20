// ── RoomsGuestsPicker ─────────────────────────────────────────────────
// Rooms & Guests field — dropdown with +/- counters for room/guest count
// แก้ไขได้: MIN_COUNT, label format — ยังไม่เช็ค capacity จริง (rough mock ก่อน)

'use client';

import { useState } from 'react';

// ── Data ───────────────────────────────────────────────────────
const MIN_COUNT = 1;
const MAX_ROOMS = 3;
const MAX_GUESTS = 8;

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
	increaseDisabled?: boolean;
};

// ── Sub components ────────────────────────────────────────────
const CounterRow = ({ label, count, onDecrease, onIncrease, increaseDisabled = false }: CounterRowProps) => (
	<div className="flex h-10 w-full items-center px-4 py-2">
		<span className="flex-1 [font-family:var(--font-inter)] text-base text-[#646D89]">{label}</span>
		<div className="flex w-19.5 items-center justify-between gap-1">
			<button
				type="button"
				onClick={onDecrease}
				disabled={count <= MIN_COUNT}
				className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 hover:bg-gray-100 active:scale-90 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
			>
				<MinusIcon />
			</button>
			<span className="mx-auto [font-family:var(--font-inter)] text-base text-[#646D89]">{count}</span>
			<button
				type="button"
				onClick={onIncrease}
				disabled={increaseDisabled}
				className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 hover:bg-gray-100 active:scale-90 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
			>
				<PlusIcon />
			</button>
		</div>
	</div>
);

type RoomsGuestsPickerProps = {
	rooms?: number;
	guests?: number;
	onRoomsChange?: (rooms: number) => void;
	onGuestsChange?: (guests: number) => void;
};

// ── Component ──────────────────────────────────────────────────
const RoomsGuestsPicker = ({
	rooms: roomsProp,
	guests: guestsProp,
	onRoomsChange,
	onGuestsChange,
}: RoomsGuestsPickerProps) => {
	const [uncontrolledRooms, setUncontrolledRooms] = useState(roomsProp ?? 1);
	const [uncontrolledGuests, setUncontrolledGuests] = useState(guestsProp ?? 2);
	const [isOpen, setIsOpen] = useState(false);

	const rooms = onRoomsChange ? (roomsProp ?? 1) : uncontrolledRooms;
	const guests = onGuestsChange ? (guestsProp ?? 2) : uncontrolledGuests;

	const setRooms = (value: number) => {
		if (onRoomsChange) {
			onRoomsChange(value);
			return;
		}
		setUncontrolledRooms(value);
	};

	const setGuests = (value: number) => {
		if (onGuestsChange) {
			onGuestsChange(value);
			return;
		}
		setUncontrolledGuests(value);
	};

	const summary = `${rooms} room${rooms > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}`;

	return (
		<div className="relative flex w-full min-w-0 flex-col items-start gap-1 lg:w-60 lg:flex-none">
			<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Rooms & Guests</span>

			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex h-12 w-full min-w-0 cursor-pointer items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-3 pl-3 lg:w-60 lg:pr-4"
			>
				<span className="min-w-0 flex-1 truncate text-left [font-family:var(--font-inter)] text-base text-[#9AA1B9]">
					{summary}
				</span>
				<DropdownIcon />
			</button>

			{isOpen && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

					<div className="absolute top-full left-0 z-20 mt-2 flex w-full min-w-60 max-w-[calc(100vw-2rem)] flex-col gap-1.5 rounded bg-white py-2 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] animate-[dropdown-in_150ms_ease-out] lg:w-60">
						<CounterRow
							label="Room"
							count={rooms}
							onDecrease={() => setRooms(Math.max(MIN_COUNT, rooms - 1))}
							onIncrease={() => setRooms(Math.min(MAX_ROOMS, rooms + 1))}
							increaseDisabled={rooms >= MAX_ROOMS}
						/>
						<CounterRow
							label="Guest"
							count={guests}
							onDecrease={() => setGuests(Math.max(MIN_COUNT, guests - 1))}
							onIncrease={() => setGuests(Math.min(MAX_GUESTS, guests + 1))}
							increaseDisabled={guests >= MAX_GUESTS}
						/>
					</div>
				</>
			)}
		</div>
	);
};

export default RoomsGuestsPicker;
