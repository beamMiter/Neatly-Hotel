// ── BookingSearch ─────────────────────────────────────────────────────
// Booking search card — check-in/out (DatePicker) + rooms & guests, overlaps bottom edge of Hero image
// แก้ไขได้: placeholder text, layout spacing

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../ui/DatePicker';
import RoomsGuestsPicker from '../ui/RoomsGuestsPicker';

type BookingSearchProps = {
	initialQuery?: {
		checkIn?: string;
		checkOut?: string;
		rooms?: number;
		guests?: number;
	};
	compact?: boolean;
};

const startOfLocalDay = (date = new Date()) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addLocalDays = (date: Date, days: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const getDefaultStay = () => {
	const checkIn = startOfLocalDay();
	return { checkIn, checkOut: addLocalDays(checkIn, 1) };
};

const msUntilNextMidnight = () => {
	const now = new Date();
	return addLocalDays(startOfLocalDay(now), 1).getTime() - now.getTime();
};

const parseDate = (value?: string) => {
	if (!value) return null;
	const parsed = new Date(`${value}T00:00:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const BookingSearch = ({ initialQuery, compact = false }: BookingSearchProps) => {
	const router = useRouter();
	const hasUrlDates = Boolean(initialQuery?.checkIn && initialQuery?.checkOut);
	const usingDefaults = useRef(!hasUrlDates);
	const [checkIn, setCheckIn] = useState<Date | null>(
		() => parseDate(initialQuery?.checkIn) ?? getDefaultStay().checkIn,
	);
	const [checkOut, setCheckOut] = useState<Date | null>(
		() => parseDate(initialQuery?.checkOut) ?? getDefaultStay().checkOut,
	);
	const [rooms, setRooms] = useState(Math.min(initialQuery?.rooms ?? 1, 3));
	const [guests, setGuests] = useState(Math.min(initialQuery?.guests ?? 2, 8));

	useEffect(() => {
		if (hasUrlDates) return;

		let timeoutId: ReturnType<typeof setTimeout>;

		const schedule = () => {
			timeoutId = setTimeout(() => {
				if (usingDefaults.current) {
					const nextStay = getDefaultStay();
					setCheckIn(nextStay.checkIn);
					setCheckOut(nextStay.checkOut);
				}
				schedule();
			}, msUntilNextMidnight() + 50);
		};

		schedule();
		return () => clearTimeout(timeoutId);
	}, [hasUrlDates]);

	const handleSearch = () => {
		const params = new URLSearchParams();
		if (checkIn) params.set('checkIn', toIsoDate(checkIn));
		if (checkOut) params.set('checkOut', toIsoDate(checkOut));
		params.set('rooms', String(rooms));
		params.set('guests', String(guests));
		router.push(`/search?${params.toString()}`);
	};

	return (
		<div
			className={`relative z-10 mx-auto flex w-280 max-w-full flex-col items-end rounded bg-white lg:flex-row ${
				compact
					? 'gap-4 p-3 lg:gap-6 lg:p-4'
					: 'gap-10 p-4 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] lg:p-15'
			}`}
		>
			<div className="flex w-full flex-col gap-6 lg:w-auto lg:flex-row lg:items-end lg:gap-10">
				<DatePicker
					checkIn={checkIn}
					checkOut={checkOut}
					onChange={(nextCheckIn, nextCheckOut) => {
						usingDefaults.current = false;
						setCheckIn(nextCheckIn);
						setCheckOut(nextCheckOut);
					}}
				/>

				<RoomsGuestsPicker
					rooms={rooms}
					guests={guests}
					onRoomsChange={setRooms}
					onGuestsChange={setGuests}
				/>
			</div>

			<button
				type="button"
				onClick={handleSearch}
				className="flex h-12 w-full flex-none items-center justify-center gap-2.5 rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 active:scale-90 lg:w-36"
			>
				Search
			</button>
		</div>
	);
};

export default BookingSearch;
