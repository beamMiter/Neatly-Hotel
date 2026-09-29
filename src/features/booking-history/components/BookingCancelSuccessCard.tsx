"use client";

import Link from "next/link";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const weekday = WEEKDAY_SHORT[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()];
  return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

const formatThb = (amount: number) =>
  `THB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

type BookingCancelSuccessCardProps = {
  roomTypeName: string;
  bookingCreatedAt: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  cancelledAt: string;
  refunded: boolean;
  totalAmount: number;
};

// Shared by /refund and /cancel-booking's success phase — the copy, and
// whether the Total Refund row shows at all, are driven entirely by
// `refunded` (the API's actual result), not by which route got here.
export function BookingCancelSuccessCard({
  roomTypeName,
  bookingCreatedAt,
  checkIn,
  checkOut,
  guests,
  cancelledAt,
  refunded,
  totalAmount,
}: BookingCancelSuccessCardProps) {
  return (
    <div className="flex animate-[fade-slide_400ms_ease-out] justify-center px-6 pt-20">
      <div className="flex w-full max-w-184.5 flex-col items-start overflow-hidden rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex w-full flex-col items-center gap-3 bg-[#2F3E35] px-6 py-10 text-center">
          <h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-3xl leading-[125%] tracking-[-0.02em] text-white lg:text-[44px]">
            {refunded ? "Your Request has been Submitted" : "The Cancellation is Complete"}
          </h1>
          {refunded ? (
            <p className="max-w-172.5 [font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#ABC0B4]">
              The cancellation is complete.
              <br />
              You will recieve an email with a detail and refund within 48 hours.
            </p>
          ) : (
            <p className="max-w-172.5 [font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#ABC0B4]">
              Your booking has been cancelled. As it was cancelled more than 72 hours (3 days)
              after booking, no refund applies.
            </p>
          )}
        </div>

        <div className="flex w-full flex-col items-end gap-10 px-6 py-6 lg:px-10 lg:pt-6 lg:pb-10">
          <div className="flex w-full flex-col items-end gap-10 rounded bg-[#5D7B6A] p-6">
            <div className="flex w-full flex-col gap-4">
              <span className="[font-family:var(--font-inter)] text-lg leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {roomTypeName}
              </span>

              <div className="flex flex-col gap-2">
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  {formatDate(checkIn)} - {formatDate(checkOut)}
                </p>
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                  {guests} Guests
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="[font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  Booking date: {formatDate(bookingCreatedAt.slice(0, 10))}
                </p>
                <p className="[font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  Cancellation date: {formatDate(cancelledAt.slice(0, 10))}
                </p>
              </div>
            </div>

            {refunded ? (
              <div className="flex w-full items-baseline justify-between gap-6 border-t border-[#5D7B6A] pt-6">
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  Total Refund
                </span>
                <span className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  {formatThb(totalAmount)}
                </span>
              </div>
            ) : null}
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
  );
}
