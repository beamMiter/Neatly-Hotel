"use client";

import Image from "next/image";
import { formatThb } from "@/features/booking/format";
import { formatBookingDate, formatStayDate, type BookingCancelType } from "@/lib/booking-actions";

type BookingCancelConfirmCardProps = {
  variant: BookingCancelType;
  roomTypeName: string;
  imageUrl: string;
  bookingCreatedAt: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const COPY: Record<BookingCancelType, { title: string; confirmLabel: string }> = {
  refundable: {
    title: "Request a Refund",
    confirmLabel: "Cancel and Refund this Booking",
  },
  "non-refundable": {
    title: "Cancel Booking",
    confirmLabel: "Cancel this Booking",
  },
};

// Second, final confirmation step for cancelling a booking — reached after
// the "are you sure?" modal on booking-history (CancelBookingModal) links
// here rather than cancelling directly. Shared by /refund and
// /cancel-booking, which each render this in their "confirm" phase (see
// RefundReceiptView / CancelBookingReceiptView) before swapping to their
// existing post-action receipt content.
//
// Layout mirrors /change-date's page (ChangeDateView) — same container
// width, title size, image size, and footer button placement — so the
// three booking-action pages read as one consistent flow.
export function BookingCancelConfirmCard({
  variant,
  roomTypeName,
  imageUrl,
  bookingCreatedAt,
  checkIn,
  checkOut,
  guests,
  totalAmount,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: BookingCancelConfirmCardProps) {
  const copy = COPY[variant];
  const isRefundable = variant === "refundable";

  return (
    <div className="mx-auto max-w-280 px-6 pt-20 lg:px-10">
      <h1
        className={`[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] leading-[125%] tracking-[-0.02em] lg:text-[68px] ${
          isRefundable ? "italic text-[#2F3E35]" : "text-[#465C50]"
        }`}
      >
        {copy.title}
      </h1>

      <div className="mt-20 flex flex-col gap-8 py-10 lg:flex-row">
        <div className="relative h-52.5 w-full flex-none overflow-hidden rounded lg:h-52.5 lg:w-89.25">
          <Image src={imageUrl} alt={roomTypeName} fill sizes="360px" className="object-cover" />
        </div>

        <div className="flex w-full flex-1 flex-col gap-8">
          <div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
            <h2 className="[font-family:var(--font-inter)] text-2xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
              {roomTypeName}
            </h2>
            <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]">
              Booking date: {formatBookingDate(bookingCreatedAt)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <p className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
              {formatStayDate(checkIn)} - {formatStayDate(checkOut)}
            </p>
            <p className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
              {guests} {guests === 1 ? "Guest" : "Guests"}
            </p>
          </div>

          {isRefundable ? (
            <div className="flex items-center justify-between gap-6 rounded bg-white p-4">
              <span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#9AA1B9]">
                Total Refund
              </span>
              <span className="[font-family:var(--font-inter)] text-xl font-semibold tracking-[-0.02em] text-[#2A2E3F]">
                {formatThb(totalAmount)}
              </span>
            </div>
          ) : (
            <p className="[font-family:var(--font-inter)] text-sm tracking-[-0.02em] text-[#B61515]">
              *Cancellation of the booking now will not be able to request a refund.
            </p>
          )}

          {error ? (
            <p className="[font-family:var(--font-inter)] text-sm text-[#B61515]">{error}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-[#E4E6ED] py-10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors duration-150 hover:text-[#C14817] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90 disabled:cursor-default disabled:opacity-60"
        >
          {isSubmitting ? "Cancelling..." : copy.confirmLabel}
        </button>
      </div>
    </div>
  );
}
