// ── DatePicker ────────────────────────────────────────────────────────
// Check In / Check Out range picker — 2-month calendar dropdown
// แก้ไขได้: WEEKDAY_LABELS, MONTH_LABELS, ยังไม่เช็ค availability จริง (rough mock ก่อน)

'use client';

import { useState } from 'react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type CalendarDay = {
	date: Date;
	inCurrentMonth: boolean;
};

// ── Data ───────────────────────────────────────────────────────
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ────────────────────────────────────────────────────
const getCalendarDays = (year: number, month: number): CalendarDay[] => {
	const firstDay = new Date(year, month, 1);
	const startOffset = (firstDay.getDay() + 6) % 7;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const daysInPrevMonth = new Date(year, month, 0).getDate();

	const days: CalendarDay[] = [];

	for (let i = startOffset; i > 0; i--) {
		days.push({ date: new Date(year, month - 1, daysInPrevMonth - i + 1), inCurrentMonth: false });
	}

	for (let d = 1; d <= daysInMonth; d++) {
		days.push({ date: new Date(year, month, d), inCurrentMonth: true });
	}

	while (days.length % 7 !== 0) {
		const last = days[days.length - 1].date;
		const next = new Date(last);
		next.setDate(last.getDate() + 1);
		days.push({ date: next, inCurrentMonth: false });
	}

	return days;
};

const formatDate = (date: Date) => {
	const weekday = WEEKDAY_SHORT[date.getDay()];
	const month = MONTH_LABELS[date.getMonth()];
	return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

const startOfLocalDay = (date = new Date()) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addLocalDays = (date: Date, days: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const isSameDay = (a: Date | null, b: Date | null) => {
	return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const isBetween = (date: Date, start: Date | null, end: Date | null) => {
	return !!start && !!end && date > start && date < end;
};

type DatePickerProps = {
	checkIn?: Date | null;
	checkOut?: Date | null;
	onChange?: (checkIn: Date | null, checkOut: Date | null) => void;
};

// ── Component ──────────────────────────────────────────────────
const DatePicker = ({ checkIn: checkInProp, checkOut: checkOutProp, onChange }: DatePickerProps) => {
	const today = new Date();
	const [viewYear, setViewYear] = useState(today.getFullYear());
	const [viewMonth, setViewMonth] = useState(today.getMonth());
	const [uncontrolledCheckIn, setUncontrolledCheckIn] = useState<Date | null>(
		checkInProp ?? startOfLocalDay(),
	);
	const [uncontrolledCheckOut, setUncontrolledCheckOut] = useState<Date | null>(
		checkOutProp ?? addLocalDays(startOfLocalDay(), 1),
	);
	const [isOpen, setIsOpen] = useState(false);

	const checkIn = onChange ? (checkInProp ?? null) : uncontrolledCheckIn;
	const checkOut = onChange ? (checkOutProp ?? null) : uncontrolledCheckOut;

	const setRange = (nextCheckIn: Date | null, nextCheckOut: Date | null) => {
		if (onChange) {
			onChange(nextCheckIn, nextCheckOut);
			return;
		}
		setUncontrolledCheckIn(nextCheckIn);
		setUncontrolledCheckOut(nextCheckOut);
	};

	const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
	const leftDays = getCalendarDays(viewYear, viewMonth);
	const rightDays = getCalendarDays(nextMonthDate.getFullYear(), nextMonthDate.getMonth());

	const handlePrevMonth = () => {
		const prev = new Date(viewYear, viewMonth - 1, 1);
		setViewYear(prev.getFullYear());
		setViewMonth(prev.getMonth());
	};

	const handleNextMonth = () => {
		const next = new Date(viewYear, viewMonth + 1, 1);
		setViewYear(next.getFullYear());
		setViewMonth(next.getMonth());
	};

	const handleSelectDay = (date: Date) => {
		if (isSameDay(date, checkIn)) {
			setRange(null, null);
			return;
		}

		if (isSameDay(date, checkOut)) {
			setRange(checkIn, null);
			return;
		}

		if (!checkIn || date < checkIn) {
			setRange(date, null);
			return;
		}

		setRange(checkIn, date);
	};

	const renderCalendarGrid = (days: CalendarDay[]) => (
		<div className="grid grid-cols-7 gap-y-2">
			{WEEKDAY_LABELS.map((label, index) => (
				<span key={index} className="flex h-8 w-8 items-center justify-center text-xs text-[#9AA1B9]">
					{label}
				</span>
			))}

			{days.map(({ date, inCurrentMonth }, index) => {
				const isSelected = isSameDay(date, checkIn) || isSameDay(date, checkOut);
				const isRange = isBetween(date, checkIn, checkOut);

				return (
					<button
						type="button"
						key={index}
						disabled={!inCurrentMonth}
						onClick={() => handleSelectDay(date)}
						className={`flex h-8 w-8 items-center justify-center rounded-full text-sm [font-family:var(--font-inter)] transition-colors duration-150 ${
							!inCurrentMonth ? 'text-[#D6D9E4]' : 'text-[#2A2E3F]'
						} ${
							isSelected
								? 'animate-[date-pop_250ms_ease-out] bg-[#C14817] text-white'
								: isRange
									? 'bg-[#FBEAE0]'
									: inCurrentMonth
										? 'hover:bg-gray-100'
										: ''
						}`}
					>
						{date.getDate()}
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="relative flex w-full flex-col items-stretch gap-6 lg:w-auto lg:flex-row lg:items-center lg:justify-center">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex w-full flex-col items-start gap-1 lg:w-60"
			>
				<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Check In</span>
				<span className="flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 lg:w-60">
					<span className="flex-1 text-left [font-family:var(--font-inter)] text-base text-[#9AA1B9]">
						{checkIn ? formatDate(checkIn) : formatDate(startOfLocalDay())}
					</span>
					<span
						className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-150 ${isOpen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
					>
						<Image src="/images/icon/calender.svg" alt="" width={24} height={24} />
					</span>
				</span>
			</button>

			<span className="hidden lg:mt-7 lg:flex lg:h-12 lg:w-2 lg:items-center lg:text-base lg:text-black">-</span>

			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex w-full flex-col items-start gap-1 lg:w-60"
			>
				<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Check Out</span>
				<span className="flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 lg:w-60">
					<span className="flex-1 text-left [font-family:var(--font-inter)] text-base text-[#9AA1B9]">
						{checkOut ? formatDate(checkOut) : formatDate(addLocalDays(startOfLocalDay(), 1))}
					</span>
					<span
						className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-150 ${isOpen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
					>
						<Image src="/images/icon/calender.svg" alt="" width={24} height={24} />
					</span>
				</span>
			</button>

			{isOpen && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

					<div className="absolute top-full left-0 z-20 mt-2 flex w-max origin-top flex-col gap-4 rounded border border-[#D6D9E4] bg-white p-4 shadow-lg animate-[dropdown-in_150ms_ease-out] lg:p-6">
						<div className="flex items-center justify-between gap-8">
							<button
								type="button"
								onClick={handlePrevMonth}
								className="flex h-8 w-8 items-center justify-center text-[#9AA1B9]"
							>
								‹
							</button>

							<div className="flex flex-1 justify-between">
								<span className="[font-family:var(--font-inter)] text-base font-medium text-[#2A2E3F]">
									{MONTH_LABELS[viewMonth]} {viewYear}
								</span>
								<span className="hidden [font-family:var(--font-inter)] text-base font-medium text-[#2A2E3F] lg:block">
									{MONTH_LABELS[nextMonthDate.getMonth()]} {nextMonthDate.getFullYear()}
								</span>
							</div>

							<button
								type="button"
								onClick={handleNextMonth}
								className="flex h-8 w-8 items-center justify-center text-[#9AA1B9]"
							>
								›
							</button>
						</div>

						<div className="flex gap-8">
							{renderCalendarGrid(leftDays)}
							<div className="hidden lg:block">{renderCalendarGrid(rightDays)}</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default DatePicker;
