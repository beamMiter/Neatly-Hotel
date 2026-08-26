// ── CancelBookingPage ────────────────────────────────────────────────
// Mock หน้ายกเลิกการจองแบบไม่เข้าเงื่อนไข refund — มี Navbar ไม่มี Footer, ยังไม่เชื่อมกับหน้าไหน (เข้าตรงๆ ผ่าน /cancel-booking)
// สอง view ในไฟล์เดียว: ฟอร์มยืนยันยกเลิก (default) → หน้ายืนยันสำเร็จ (หลังกด Cancel Booking) — ต่างจาก /refund ตรงไม่มียอดเงินคืนเลย
// แก้ไขได้: MOCK_BOOKING (ห้อง, วันที่) — ยังไม่ต่อ backend จริง

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import PageTransitionSpinner from '@/components/shared/PageTransitionSpinner';
import { ROOMS } from '@/data/rooms';

// ── Data ───────────────────────────────────────────────────────
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const room = ROOMS.find((item) => item.slug === 'superior-garden-view') ?? ROOMS[0];

const ORIGINAL_CHECK_IN = new Date(2025, 9, 16);
const ORIGINAL_CHECK_OUT = new Date(2025, 9, 19);
const BOOKING_DATE = new Date(2025, 9, 12);
const CANCELLATION_DATE = new Date(2025, 9, 18);
const GUESTS = 2;

const LEAVE_DURATION = 700;

const formatDate = (date: Date) => {
	const weekday = WEEKDAY_SHORT[date.getDay()];
	const month = MONTH_LABELS[date.getMonth()];
	return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

// ── Component ──────────────────────────────────────────────────
const CancelBookingPage = () => {
	const router = useRouter();
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);

	const handleCancel = () => {
		setIsLeaving(true);
		window.setTimeout(() => router.push('/'), LEAVE_DURATION);
	};

	const handleConfirmCancel = () => {
		setIsLeaving(true);
		window.setTimeout(() => {
			setIsSubmitted(true);
			setIsLeaving(false);
		}, LEAVE_DURATION);
	};

	return (
		<div className="flex min-h-screen flex-col">
			<Navbar />

			<main className="flex-1 bg-[#F7F7FB] pb-20">
				{isSubmitted ? (
					<div className="flex animate-[fade-slide_400ms_ease-out] justify-center px-6 pt-20">
						<div className="flex w-full max-w-184.5 flex-col items-start overflow-hidden rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
							<div className="flex w-full flex-col items-center gap-3 bg-[#2F3E35] px-6 py-10 text-center">
								<h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-3xl leading-[125%] tracking-[-0.02em] text-white lg:text-[44px]">
									The Cancellation is Complete
								</h1>
								<p className="max-w-172.5 [font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#ABC0B4]">
									The cancellation is complete. You will receive an email with a detail of cancellation within 24 hours.
								</p>
							</div>

							<div className="flex w-full flex-col items-end gap-10 px-6 py-6 lg:px-10 lg:pt-6 lg:pb-10">
								<div className="flex w-full flex-col items-end gap-10 rounded bg-[#5D7B6A] p-6">
									<div className="flex w-full flex-col gap-4">
										<span className="[font-family:var(--font-inter)] text-lg leading-[150%] font-semibold tracking-[-0.02em] text-white">
											{room.name}
										</span>

										<div className="flex flex-col gap-2">
											<p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
												{formatDate(ORIGINAL_CHECK_IN)} - {formatDate(ORIGINAL_CHECK_OUT)}
											</p>
											<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
												{GUESTS} Guests
											</p>
										</div>

										<div className="flex flex-col gap-2">
											<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
												Booking date: {formatDate(BOOKING_DATE)}
											</p>
											<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
												Cancellation date: {formatDate(CANCELLATION_DATE)}
											</p>
										</div>
									</div>
								</div>

								<Link
									href="/"
									className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
								>
									Back to Home
								</Link>
							</div>
						</div>
					</div>
				) : (
					<div
						className={`mx-auto max-w-280 px-6 pt-20 transition-opacity duration-300 lg:px-10 ${
							isLeaving ? 'opacity-0' : 'animate-[fade-slide_400ms_ease-out]'
						}`}
					>
						<h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] leading-[125%] tracking-[-0.02em] text-black lg:text-[68px]">
							Cancel Booking
						</h1>

						<div className="mt-20 flex flex-col gap-8 py-10 lg:flex-row">
							<div className="relative h-52.5 w-full flex-none overflow-hidden rounded lg:h-52.5 lg:w-89.25">
								<Image src={room.gallery[0]} alt={room.name} fill sizes="360px" className="object-cover" />
							</div>

							<div className="flex w-full flex-1 flex-col gap-10">
								<div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
									<span className="[font-family:var(--font-inter)] text-2xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
										{room.name}
									</span>
									<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]">
										Booking date: {formatDate(BOOKING_DATE)}
									</span>
								</div>

								<div className="flex flex-col gap-2">
									<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]">
										{formatDate(ORIGINAL_CHECK_IN)} - {formatDate(ORIGINAL_CHECK_OUT)}
									</p>
									<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]">
										{GUESTS} Guests
									</p>
									<p className="[font-family:var(--font-inter)] text-xs leading-[150%] tracking-[-0.02em] text-[#B61515]">
										*Cancellation of the booking now will not be able to request a refund.
									</p>
								</div>
							</div>
						</div>

						<div className="mt-10 flex items-center justify-between border-t border-[#E4E6ED] py-10">
							<button
								type="button"
								onClick={handleCancel}
								className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors duration-150 hover:text-[#C14817]"
							>
								Cancel
							</button>

							<button
								type="button"
								onClick={handleConfirmCancel}
								className="flex h-12 w-54 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
							>
								Cancel Booking
							</button>
						</div>
					</div>
				)}
			</main>

			<PageTransitionSpinner show={isLeaving} />
		</div>
	);
};

export default CancelBookingPage;
