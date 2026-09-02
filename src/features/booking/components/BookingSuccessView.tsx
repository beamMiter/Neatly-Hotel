"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nightsBetween } from "@/features/booking/date-rules";
import { formatDateLabel, formatThb } from "@/features/booking/format";
import type { BookingRecord } from "@/types/booking";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;

type BookingSuccessViewProps = {
  bookingId: string;
  initialBooking: BookingRecord;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
};

const HEAD_CLASSNAME = "flex w-full flex-col items-center justify-center gap-3 bg-[#2F3E35] px-6 py-10";
const HEADLINE_CLASSNAME =
  "[font-family:var(--font-noto-serif)] text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-white text-center";
const SUBTEXT_CLASSNAME =
  "[font-family:var(--font-inter)] text-sm leading-[150%] font-medium tracking-[-0.02em] text-[#ABC0B4] text-center";

// `confirmPayment` on the client resolves before Stripe's webhook lands —
// the webhook (not this page's initial load) is what actually marks the
// booking paid. Poll briefly for that to catch up rather than showing a
// false "pending" for a payment that already succeeded (see plan §9).
export function BookingSuccessView({
  bookingId,
  initialBooking,
  checkInTimeLabel,
  checkOutTimeLabel,
}: BookingSuccessViewProps) {
  const router = useRouter();
  const [booking, setBooking] = useState(initialBooking);
  const [timedOut, setTimedOut] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (booking.paymentMethod === "cash" || booking.paymentStatus !== "pending") return;
    startedAtRef.current ??= Date.now();

    const interval = setInterval(async () => {
      if (startedAtRef.current !== null && Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) return;
        const data = await response.json();
        const updated = data.booking as BookingRecord;
        setBooking(updated);
        if (updated.paymentStatus === "paid") setTimedOut(false);
      } catch {
        // keep polling — a transient network error shouldn't stop the loop
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [bookingId, booking.paymentMethod, booking.paymentStatus]);

  // A failed webhook can land *before* this page's own first fetch — the
  // client-side PromptPay/card confirm calls are advisory-only and can push
  // here even when the payment didn't actually succeed (confirmed case: an
  // expired PromptPay QR resolves with no Stripe error at all, so the guest
  // still landed on /booking/success while the DB row was already
  // `payment_status: "failed"`). The poll loop above only catches a failure
  // that arrives *during* polling — this effect is what catches "already
  // failed by the time we got here", which is not covered by any render
  // branch below otherwise.
  useEffect(() => {
    if (booking.paymentStatus === "failed") {
      router.push(`/booking/failed?bookingId=${bookingId}`);
    }
  }, [bookingId, booking.paymentStatus, router]);

  const isConfirming = booking.paymentMethod !== "cash" && booking.paymentStatus === "pending" && !timedOut;
  const isFailed = booking.paymentStatus === "failed";

  if (isConfirming || timedOut || isFailed) {
    return (
      <div className="mx-auto max-w-[738px] pb-6 lg:px-4 lg:py-20">
        <div className="overflow-hidden lg:rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
          <div className={HEAD_CLASSNAME}>
            <h1 className={HEADLINE_CLASSNAME}>
              {isFailed
                ? "This payment wasn't completed"
                : isConfirming
                  ? "Confirming your payment..."
                  : "We're confirming your payment"}
            </h1>
            <p className={SUBTEXT_CLASSNAME}>
              {isFailed
                ? "Taking you to the booking failed page..."
                : isConfirming
                  ? "This usually takes a few seconds. Please don't close this page."
                  : `Booking ${booking.bookingCode} has been received. We'll email you once payment is confirmed.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nights = Math.max(nightsBetween(booking.checkIn, booking.checkOut), 1);
  const addonsTotal = booking.specialRequests.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const roomSubtotal = booking.totalAmount - addonsTotal + booking.discountAmount;
  const paidByLabel = booking.paymentMethod === "cash" ? "Payment method" : "Payment success via";
  const paidByValue =
    booking.paymentMethod === "credit_card"
      ? `Credit Card${booking.cardLast4 ? ` - *${booking.cardLast4}` : ""}`
      : booking.paymentMethod === "promptpay"
        ? "PromptPay"
        : "Cash (Pay at Hotel)";

  return (
    <div className="mx-auto max-w-[738px] pb-6 lg:px-4 lg:py-20">
      <div className="flex w-full flex-col overflow-hidden lg:rounded bg-[#465C50] shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
        <div className={HEAD_CLASSNAME}>
          <h1 className={HEADLINE_CLASSNAME}>Thank you for booking</h1>
          <p className={SUBTEXT_CLASSNAME}>
            We are looking forward to hosting you at our place. We will send you more information about check-in and
            staying at our Neatly closer to your date of reservation
          </p>
        </div>

        <div className="flex w-full flex-col items-end gap-10 px-4 pt-6 pb-10 lg:px-10">
          <div className="flex w-full flex-col gap-6 rounded bg-[#5D7B6A] p-4 lg:flex-row lg:gap-10 lg:p-6">
            <div className="flex flex-1 flex-col gap-2">
              <p className="[font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                Booking code
              </p>
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {booking.bookingCode}
              </p>
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {formatDateLabel(booking.checkIn)} &ndash; {formatDateLabel(booking.checkOut)}
              </p>
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                {booking.guests} Guest{booking.guests === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-col gap-2">
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  Check-in
                </p>
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                  After {checkInTimeLabel}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  Check-out
                </p>
                <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                  Before {checkOutTimeLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-baseline justify-end gap-4">
            <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
              {paidByLabel}
            </span>
            <span className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-[#D5DFDA]">
              {paidByValue}
            </span>
          </div>

          <div className="flex w-full flex-col">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                {booking.roomTypeName}
                {booking.rooms > 1 ? ` × ${booking.rooms}` : ""} · {nights} night{nights === 1 ? "" : "s"}
              </span>
              <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {formatThb(roomSubtotal)}
              </span>
            </div>

            {booking.specialRequests.map((addon) => (
              <div key={addon.code} className="flex items-baseline justify-between gap-4 py-3">
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  {addon.label}
                  {addon.quantity > 1 ? ` × ${addon.quantity}` : ""}
                </span>
                <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  {formatThb(addon.price * addon.quantity)}
                </span>
              </div>
            ))}

            {booking.discountAmount > 0 && (
              <div className="flex items-baseline justify-between gap-4 py-3">
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  Promotion Code
                </span>
                <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  -{formatThb(booking.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-4 border-t border-[#5D7B6A] pt-6">
              <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                Total
              </span>
              <span className="shrink-0 [font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {formatThb(booking.totalAmount)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile stacks primary (full-width) above the ghost button; desktop
          keeps them side by side — matches the Figma "button wrapper" frame. */}
      <div className="flex flex-col items-center gap-6 px-6 pt-10 lg:flex-row lg:justify-center lg:gap-10 lg:px-0">
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-95 lg:order-2 lg:w-[172px]"
        >
          Back to Home
        </Link>
        {/* No standalone "view my booking" page exists yet anywhere in the
            app (checked both this branch and the team's dev branch) — this
            button is a placeholder for the Figma spec until that page
            exists. */}
        <button
          type="button"
          disabled
          className="cursor-not-allowed px-2 py-1 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-[#E76B39] opacity-50 lg:order-1"
        >
          Check Booking Detail
        </button>
      </div>
    </div>
  );
}
