// ── RefundReceiptView ────────────────────────────────────────────────
// Client half of /refund — the refund itself already happened (Stripe call
// + booking.status = "refunded") inside CancelBookingModal before the
// redirect here. This is now a pure receipt screen, not a second action
// trigger — no submit button, just what was refunded.

'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (isoDate: string) => {
	const date = new Date(`${isoDate}T00:00:00`);
	const weekday = WEEKDAY_SHORT[date.getDay()];
	const month = MONTH_LABELS[date.getMonth()];
	return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

const formatThb = (amount: number) =>
	`THB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

type RefundReceiptViewProps = {
	roomName: string;
	checkIn: string;
	checkOut: string;
	guests: number;
	refundAmount: number;
};

const RefundReceiptView = ({ roomName, checkIn, checkOut, guests, refundAmount }: RefundReceiptViewProps) => {
	return (
		<div className="flex min-h-screen flex-col">
			<Navbar />

			<main className="flex-1 bg-[#F7F7FB] pb-20">
				<div className="flex animate-[fade-slide_400ms_ease-out] justify-center px-6 pt-20">
					<div className="flex w-full max-w-184.5 flex-col items-start overflow-hidden rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
						<div className="flex w-full flex-col items-center gap-3 bg-[#2F3E35] px-6 py-10 text-center">
							<h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-3xl leading-[125%] tracking-[-0.02em] text-white lg:text-[44px]">
								Your Refund has been Processed
							</h1>
							<p className="max-w-172.5 [font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#ABC0B4]">
								Your booking has been cancelled and the refund has been issued to your original payment method.
							</p>
						</div>

						<div className="flex w-full flex-col items-end gap-10 px-6 py-6 lg:px-10 lg:pt-6 lg:pb-10">
							<div className="flex w-full flex-col items-end gap-10 rounded bg-[#5D7B6A] p-6">
								<div className="flex w-full flex-col gap-4">
									<div className="flex flex-wrap items-start gap-6 lg:gap-10">
										<span className="[font-family:var(--font-inter)] text-lg leading-[150%] font-semibold tracking-[-0.02em] text-white">
											{roomName}
										</span>
									</div>

									<div className="flex flex-col gap-2">
										<p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
											{formatDate(checkIn)} - {formatDate(checkOut)}
										</p>
										<p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
											{guests} Guests
										</p>
									</div>
								</div>

								<div className="flex w-full items-baseline justify-between gap-6 border-t border-[#5D7B6A] pt-6">
									<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
										Total Refund
									</span>
									<span className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
										{formatThb(refundAmount)}
									</span>
								</div>
							</div>

							<Link
								href="/booking-history"
								className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
							>
								Back to Booking History
							</Link>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default RefundReceiptView;
