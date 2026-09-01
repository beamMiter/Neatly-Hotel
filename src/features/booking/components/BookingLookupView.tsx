"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isChangeDateEligible, isRefundEligible, nightsBetween } from "@/features/booking/date-rules";
import { formatDateLabel, formatThb } from "@/features/booking/format";
import { CancelBookingModal } from "@/features/booking-history/components/CancelBookingModal";
import type { BookingCancelType } from "@/lib/booking-actions";
import type { BookingRecord } from "@/types/booking";

const INPUT_CLASSNAME =
  "h-12 w-full rounded border border-[#D6D9E4] bg-white px-3.5 [font-family:var(--font-inter)] text-base text-black placeholder:text-black/40 focus:border-[#C14817] focus:outline-none";
const LABEL_CLASSNAME = "[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]";

export function BookingLookupView() {
  const [bookingCode, setBookingCode] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBooking(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode, email }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.message ?? "Could not find that booking");
        return;
      }

      setBooking(payload.booking as BookingRecord);
    } catch {
      setError("Could not look up booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="[font-family:var(--font-noto-serif)] text-4xl font-medium tracking-[-0.02em] text-[#2A2E3F]">
          Find your booking
        </h1>
        <p className="[font-family:var(--font-inter)] text-base text-[#646D89]">
          Enter the booking code and the email used when you booked.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border border-[#E4E6ED] bg-white p-8">
        <div className="flex flex-col gap-1">
          <label htmlFor="bookingCode" className={LABEL_CLASSNAME}>
            Booking code
          </label>
          <input
            id="bookingCode"
            className={INPUT_CLASSNAME}
            value={bookingCode}
            onChange={(event) => setBookingCode(event.target.value)}
            placeholder="NB-20260825-XXXX"
            autoComplete="off"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className={LABEL_CLASSNAME}>
            Email
          </label>
          <input
            id="email"
            type="email"
            className={INPUT_CLASSNAME}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="h-12 rounded bg-[#C14817] px-8 [font-family:var(--font-open-sans)] text-base font-semibold text-white hover:bg-[#A93F13] disabled:opacity-60"
        >
          {isLoading ? "Searching..." : "Find booking"}
        </button>
      </form>

      {booking && <BookingLookupResult booking={booking} />}

      <p className="text-center text-sm text-[#646D89]">
        <Link href="/search" className="font-semibold text-[#C14817] hover:text-[#A93F13]">
          Back to search
        </Link>
      </p>
    </div>
  );
}

// Booking is done — no more changes possible, view-only from here.
const FINALIZED_STATUSES: BookingRecord["status"][] = ["checked_in", "completed", "cancelled", "refunded"];

type CancelBookingResponse = {
  message: string;
  refunded: boolean;
};

function BookingLookupResult({ booking }: { booking: BookingRecord }) {
  const router = useRouter();
  const nights = Math.max(nightsBetween(booking.checkIn, booking.checkOut), 1);
  const statusLabel = booking.status.replaceAll("_", " ");
  const paymentLabel = booking.paymentStatus.replaceAll("_", " ");

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isFinalized = FINALIZED_STATUSES.includes(booking.status);
  const canChangeDate = !isFinalized && isChangeDateEligible(booking.createdAt);
  const canCancel = !isFinalized;
  const cancelType: BookingCancelType = isRefundEligible(booking.createdAt) ? "refundable" : "non-refundable";

  function closeCancelModal() {
    if (isCancelling) return;
    setIsCancelOpen(false);
    setCancelError(null);
  }

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as CancelBookingResponse | { message?: string } | null;

      if (!response.ok) {
        setCancelError(data?.message ?? "Unable to cancel this booking. Please try again.");
        return;
      }

      const refunded = Boolean((data as CancelBookingResponse)?.refunded);
      router.push(refunded ? `/refund?bookingId=${booking.id}` : `/cancel-booking?bookingId=${booking.id}`);
    } catch {
      setCancelError("Unable to cancel this booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#E4E6ED] bg-white p-8">
      <div className="flex flex-col gap-1 border-b border-[#E4E6ED] pb-4">
        <p className="text-sm text-[#646D89]">Booking code</p>
        <p className="text-lg font-semibold text-[#2A2E3F]">{booking.bookingCode}</p>
      </div>

      <ResultRow label="Guest" value={`${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`.trim()} />
      <ResultRow label="Status" value={statusLabel} />
      <ResultRow label="Payment" value={paymentLabel} />
      <ResultRow label="Room" value={booking.roomTypeName} />
      <ResultRow
        label="Stay"
        value={`${formatDateLabel(booking.checkIn)} – ${formatDateLabel(booking.checkOut)} (${nights} night${nights === 1 ? "" : "s"})`}
      />
      <ResultRow label="Guests" value={String(booking.guests)} />
      <ResultRow label="Total" value={formatThb(booking.totalAmount)} />

      {(canChangeDate || canCancel) && (
        <div className="mt-2 flex flex-col gap-4 border-t border-[#E4E6ED] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                className="cursor-pointer [font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] hover:text-[#A93F13]"
              >
                Cancel Booking
              </button>
            )}
          </div>

          {canChangeDate && (
            <Link
              href={`/change-date?bookingId=${booking.id}`}
              className="flex h-12 items-center justify-center rounded-sm bg-[#C14817] px-8 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13]"
            >
              Change Date
            </Link>
          )}
        </div>
      )}

      <CancelBookingModal
        open={isCancelOpen}
        variant={cancelType}
        isSubmitting={isCancelling}
        error={cancelError}
        onClose={closeCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-sm text-[#646D89]">{label}</span>
      <span className="text-sm font-medium capitalize text-[#2A2E3F] sm:text-right">{value}</span>
    </div>
  );
}
