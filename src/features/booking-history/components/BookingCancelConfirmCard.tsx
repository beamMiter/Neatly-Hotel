"use client";

import { RoomImagePlaceholder } from "@/features/booking/components/RoomImagePlaceholder";
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
    <div className="w-full max-w-2xl rounded-sm bg-white p-6 shadow-[2px_2px_12px_rgba(64,50,133,0.12)] lg:p-10">
      <h1
        className={`[font-family:var(--font-noto-serif)] text-4xl font-medium tracking-[-0.02em] lg:text-[44px] ${
          isRefundable ? "italic text-[#2F3E35]" : "text-[#2A2E3F]"
        }`}
      >
        {copy.title}
      </h1>

      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:gap-8">
        <RoomImagePlaceholder
          label={roomTypeName}
          src={imageUrl}
          className="aspect-4/3 w-full flex-none rounded-sm sm:w-40"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <span className="[font-family:var(--font-inter)] text-lg font-semibold text-[#2A2E3F]">
              {roomTypeName}
            </span>
            <span className="shrink-0 text-sm text-[#9AA1B9] sm:text-right">
              Booking date: {formatBookingDate(bookingCreatedAt)}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm text-[#646D89]">
              {formatStayDate(checkIn)} - {formatStayDate(checkOut)}
            </span>
            {isRefundable ? <span className="text-sm text-[#9AA1B9] sm:text-right">Total Refund</span> : null}
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm text-[#646D89]">
              {guests} {guests === 1 ? "Guest" : "Guests"}
            </span>
            {isRefundable ? (
              <span className="text-base font-semibold text-[#2A2E3F] sm:text-right">{formatThb(totalAmount)}</span>
            ) : null}
          </div>

          {!isRefundable ? (
            <p className="mt-1 text-sm text-[#B61515]">
              *Cancellation of the booking now will not be able to request a refund.
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-4 [font-family:var(--font-inter)] text-sm text-[#B61515]">{error}</p> : null}

      <div className="mt-10 flex flex-col gap-3 border-t border-[#E4E6ED] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer px-2 py-1 text-left [font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] transition-colors hover:text-[#A93F13] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="cursor-pointer rounded-sm bg-[#C14817] px-6 py-3 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Cancelling..." : copy.confirmLabel}
        </button>
      </div>
    </div>
  );
}
