// ── ChangeDatePicker ─────────────────────────────────────────────────
// เลือกวันเช็คอินใหม่ — เช็คเอาท์คำนวณอัตโนมัติจากจำนวนคืนเดิม (เปลี่ยนจำนวนคืนไม่ได้)
// TODO อนาคต: กันวันที่ชนกับลูกค้าคนอื่นที่จองห้องเดียวกันไว้แล้ว (ต้องรอระบบ booking จริงก่อน)
// แก้ไขได้: WEEKDAY_LABELS, MONTH_LABELS

'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type CalendarDay = {
	date: Date;
	inCurrentMonth: boolean;
};

type ChangeDatePickerProps = {
	nights: number;
	checkIn: Date;
	checkOut: Date;
	onChange: (checkIn: Date, checkOut: Date) => void;
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

const isSameDay = (a: Date | null, b: Date | null) => {
	return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const isBetween = (date: Date, start: Date, end: Date) => date > start && date < end;

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const startOfLocalDay = (date = new Date()) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

// ── Component ──────────────────────────────────────────────────
const ChangeDatePicker = ({ nights, checkIn, checkOut, onChange }: ChangeDatePickerProps) => {
	const [viewYear, setViewYear] = useState(checkIn.getFullYear());
	const [viewMonth, setViewMonth] = useState(checkIn.getMonth());
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
	const leftDays = getCalendarDays(viewYear, viewMonth);
	const rightDays = getCalendarDays(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
	const todayStart = startOfLocalDay();

	// เลื่อนจอลงมาให้เห็นปฏิทินเต็มๆ ตอนเปิด dropdown (ไม่งั้นบางทีโดนตัดขอบล่างจอ)
	useEffect(() => {
		if (isOpen) {
			dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}, [isOpen]);

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

	// เลือกวันไหนก็ตาม = เช็คอินใหม่ — เช็คเอาท์ล็อกตามจำนวนคืนเดิมเสมอ เลือกเกินจากเดิมไม่ได้
	// ไม่ปิด popup ทันที (เหมือน DatePicker เดิม) ให้เห็น animation ตอนเลือกวันก่อน ปิดเองตอนคลิกข้างนอก
	const handleSelectDay = (date: Date) => {
		onChange(date, addDays(date, nights));
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
				const isPast = date < todayStart;
				const isDisabled = !inCurrentMonth || isPast;

				return (
					<button
						type="button"
						key={index}
						disabled={isDisabled}
						onClick={() => handleSelectDay(date)}
						className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm [font-family:var(--font-inter)] transition-colors duration-150 disabled:cursor-default ${
							isDisabled ? 'text-[#D6D9E4]' : 'text-[#2A2E3F]'
						} ${
							isSelected
								? 'animate-[date-pop_250ms_ease-out] bg-[#C14817] text-white'
								: isRange
									? 'bg-[#FBEAE0]'
									: !isDisabled
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
		<div className="relative flex w-full items-center justify-center gap-6">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex w-full flex-1 cursor-pointer flex-col items-start gap-1"
			>
				<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Check In</span>
				<span className="flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3">
					<span className="flex-1 text-left [font-family:var(--font-inter)] text-base text-[#2A2E3F]">
						{formatDate(checkIn)}
					</span>
					<span
						className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-150 ${isOpen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
					>
						<Image src="/images/icon/calender.svg" alt="" width={24} height={24} />
					</span>
				</span>
			</button>

			<span className="mt-7 flex h-12 w-2 items-center text-base text-black">-</span>

			{/* เช็คเอาท์แสดงผลอย่างเดียว ไม่ใช่ปุ่มกดเลือกเอง เพราะล็อกตามจำนวนคืนเดิม */}
			<div className="flex w-full flex-1 flex-col items-start gap-1">
				<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Check Out</span>
				<span className="flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-[#F7F7FB] py-3 pr-4 pl-3">
					<span className="flex-1 text-left [font-family:var(--font-inter)] text-base text-[#646D89]">
						{formatDate(checkOut)}
					</span>
					<Image src="/images/icon/calender.svg" alt="" width={24} height={24} className="opacity-40" />
				</span>
			</div>

			{isOpen && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

					<div
						ref={dropdownRef}
						className="absolute top-full left-0 z-20 mt-2 flex w-max origin-top flex-col gap-4 rounded border border-[#D6D9E4] bg-white p-4 shadow-lg animate-[dropdown-in_150ms_ease-out] lg:p-6"
					>
						<p className="[font-family:var(--font-inter)] text-sm text-[#9AA1B9]">
							เลือกวันเช็คอินใหม่ — พัก {nights} คืนเท่าเดิม
						</p>

						<div className="flex items-center justify-between gap-8">
							<button
								type="button"
								onClick={handlePrevMonth}
								className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#9AA1B9]"
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
								className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#9AA1B9]"
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

export default ChangeDatePicker;
