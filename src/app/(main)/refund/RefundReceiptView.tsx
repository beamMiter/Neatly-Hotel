// ── RefundReceiptView ────────────────────────────────────────────────
// Client half of /refund — second (detailed) confirmation step for a
// refund-eligible cancellation. Shows the confirm card first; its confirm
// button is what actually calls the cancel API. On success, swaps in the
// existing receipt content in place (no further redirect) — branching on
// the *actual* `refunded` result returned by the API, not just on being on
// this route, since a booking's eligibility could in principle have
// crossed the 3-day boundary between the first confirm step and this one.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingCancelConfirmCard } from "@/features/booking-history/components/BookingCancelConfirmCard";

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

type CancelResponse = { message: string; refunded: boolean };

type RefundReceiptViewProps = {
  bookingId: string;
  roomName: string;
  imageUrl: string;
  bookingCreatedAt: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  initialPhase: "confirm" | "success";
  initialRefunded: boolean;
};

const RefundReceiptView = ({
  bookingId,
  roomName,
  imageUrl,
  bookingCreatedAt,
  checkIn,
  checkOut,
  guests,
  totalAmount,
  initialPhase,
  initialRefunded,
}: RefundReceiptViewProps) => {
  const router = useRouter();
  const [phase, setPhase] = useState<"confirm" | "success">(initialPhase);
  const [refunded, setRefunded] = useState(initialRefunded);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        CancelResponse | { message?: string } | null;

      if (!response.ok) {
        setError(
          data?.message ?? "Unable to cancel this booking. Please try again.",
        );
        return;
      }

      setRefunded(Boolean((data as CancelResponse)?.refunded));
      setPhase("success");
    } catch {
      setError("Unable to cancel this booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === "confirm") {
    return (
      <main className="flex-1 bg-[#F7F7FB] pb-20">
        <BookingCancelConfirmCard
          variant="refundable"
          roomTypeName={roomName}
          imageUrl={imageUrl}
          bookingCreatedAt={bookingCreatedAt}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          totalAmount={totalAmount}
          isSubmitting={isSubmitting}
          error={error}
          onCancel={() => router.push("/booking-history")}
          onConfirm={handleConfirm}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F7F7FB] pb-20">
      <div className="flex animate-[fade-slide_400ms_ease-out] justify-center px-6 pt-20">
        <div className="flex w-full max-w-184.5 flex-col items-start overflow-hidden rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
          <div className="flex w-full flex-col items-center gap-3 bg-[#2F3E35] px-6 py-10 text-center">
            <h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-3xl leading-[125%] tracking-[-0.02em] text-white lg:text-[44px]">
              {refunded
                ? "Your Refund has been Processed"
                : "The Cancellation is Complete"}
            </h1>
            <p className="max-w-172.5 [font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#ABC0B4]">
              {refunded
                ? "Your booking has been cancelled and the refund has been issued to your original payment method."
                : "Your booking has been cancelled. As it was cancelled more than 72 hours (3 days) after booking, no refund applies."}
            </p>
          </div>

          <div className="flex w-full flex-col items-end gap-10 px-6 py-6 lg:px-10 lg:pt-6 lg:pb-10">
            <div className="flex w-full flex-col items-end gap-10 rounded bg-[#5D7B6A] p-6">
              <div className="flex w-full flex-col gap-4">
                <span className="[font-family:var(--font-inter)] text-lg leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  {roomName}
                </span>

                <div className="flex flex-col gap-2">
                  <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                    {formatDate(checkIn)} - {formatDate(checkOut)}
                  </p>
                  <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                    {guests} Guests
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
              href="/booking-history"
              className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
            >
              Back to Booking History
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RefundReceiptView;
