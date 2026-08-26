// ── ChangeDatePage ────────────────────────────────────────────────────
// Mock หน้าเปลี่ยนวันที่จอง — มี Navbar ไม่มี Footer, ยังไม่เชื่อมกับหน้าไหน (เข้าตรงๆ ผ่าน /change-date)
// ORIGINAL_CHECK_IN/OUT ตอนนี้ hardcode ไว้ก่อน — อนาคตจะดึงจาก booking history จริงแทน (ยังไม่มีหน้านั้น)
// แก้ไขได้: MOCK_BOOKING (ห้อง, วันที่จองเดิม) — ยังไม่ต่อ backend จริง, ปุ่ม Cancel/Save ยังไม่มี logic

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import ChangeDatePicker from '@/components/shared/ChangeDatePicker';
import ChangeDateConfirmModal from '@/components/shared/ChangeDateConfirmModal';
import { ROOMS } from '@/data/rooms';

// ── Data ───────────────────────────────────────────────────────
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const room = ROOMS.find((item) => item.slug === 'superior-garden-view') ?? ROOMS[0];

const ORIGINAL_CHECK_IN = new Date(2025, 9, 16);
const ORIGINAL_CHECK_OUT = new Date(2025, 9, 19);
const NIGHTS = Math.round((ORIGINAL_CHECK_OUT.getTime() - ORIGINAL_CHECK_IN.getTime()) / (1000 * 60 * 60 * 24));
const BOOKING_DATE = new Date(2025, 9, 12);

const formatDate = (date: Date) => {
	const weekday = WEEKDAY_SHORT[date.getDay()];
	const month = MONTH_LABELS[date.getMonth()];
	return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

// ── Component ──────────────────────────────────────────────────
const ChangeDatePage = () => {
	const [checkIn, setCheckIn] = useState(ORIGINAL_CHECK_IN);
	const [checkOut, setCheckOut] = useState(ORIGINAL_CHECK_OUT);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const handleDateChange = (nextCheckIn: Date, nextCheckOut: Date) => {
		setCheckIn(nextCheckIn);
		setCheckOut(nextCheckOut);
	};

	const handleCancel = () => {
		setCheckIn(ORIGINAL_CHECK_IN);
		setCheckOut(ORIGINAL_CHECK_OUT);
	};

	const handleConfirmChange = () => {
		// mock — ยังไม่ต่อ backend จริง
		setIsConfirmOpen(false);
	};

	return (
		<div className="flex min-h-screen flex-col">
			<Navbar />

			<main className="flex-1 bg-[#F7F7FB] pb-20">
				<div className="mx-auto max-w-280 px-6 pt-20 lg:px-10">
					<h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] leading-[125%] tracking-[-0.02em] text-[#465C50] lg:text-[68px]">
						Change Check-in and Check-out Date
					</h1>

					<div className="mt-20 flex flex-col gap-8 py-10 lg:flex-row">
						<div className="relative h-52.5 w-full flex-none overflow-hidden rounded lg:h-52.5 lg:w-89.25">
							<Image src={room.gallery[0]} alt={room.name} fill sizes="360px" className="object-cover" />
						</div>

						<div className="flex w-full flex-1 flex-col gap-8">
							<div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
								<h2 className="[font-family:var(--font-inter)] text-2xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
									{room.name}
								</h2>
								<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]">
									Booking date: {formatDate(BOOKING_DATE)}
								</span>
							</div>

							<div className="flex flex-col gap-2">
								<span className="[font-family:var(--font-inter)] text-base font-semibold tracking-[-0.02em] text-[#424C6B]">
									Original Date
								</span>
								<p className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
									{formatDate(ORIGINAL_CHECK_IN)} - {formatDate(ORIGINAL_CHECK_OUT)} ({NIGHTS} nights)
								</p>
							</div>

							<div className="flex flex-col gap-4 rounded bg-white p-4">
								<span className="[font-family:var(--font-inter)] text-base font-semibold tracking-[-0.02em] text-[#424C6B]">
									Change Date
								</span>

								<ChangeDatePicker nights={NIGHTS} checkIn={checkIn} checkOut={checkOut} onChange={handleDateChange} />
							</div>
						</div>
					</div>

					<div className="mt-10 flex items-center justify-between">
						<button
							type="button"
							onClick={handleCancel}
							className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors duration-150 hover:text-[#C14817]"
						>
							Cancel
						</button>

						<button
							type="button"
							disabled={!checkIn || !checkOut}
							onClick={() => setIsConfirmOpen(true)}
							className="flex h-12 w-57.5 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90 disabled:cursor-default disabled:opacity-60"
						>
							Save changes
						</button>
					</div>

					<div className="mt-10 h-60 border-t border-[#E4E6ED] lg:h-80" />
				</div>
			</main>

			<ChangeDateConfirmModal
				open={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				onConfirm={handleConfirmChange}
			/>
		</div>
	);
};

export default ChangeDatePage;
