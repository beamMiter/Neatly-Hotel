"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/icons/CloseIcon";
import type { BookingCancelType } from "@/lib/booking-actions";

type CancelBookingModalProps = {
  open: boolean;
  variant: BookingCancelType;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

const COPY: Record<
  BookingCancelType,
  { body: string; confirmLabel: string }
> = {
  refundable: {
    body: "Are you sure you would like to cancel this booking?",
    confirmLabel: "Yes, I want to cancel and request refund",
  },
  "non-refundable": {
    body: "Cancellation of the booking now will not be able to request a refund. Are you sure you would like to cancel this booking?",
    confirmLabel: "Yes, I want to cancel",
  },
};

export function CancelBookingModal({
  open,
  variant,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  useEffect(() => {
    if (!open || isSubmitting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  const copy = COPY[variant];

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-60 flex animate-[fade-in_150ms_ease-out] items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="w-full max-w-2xl animate-[fade-slide_200ms_ease-out] rounded-sm bg-white shadow-[2px_2px_12px_rgba(64,50,133,0.12)]"
      >
        <div className="flex items-center justify-between border-b border-[#E4E6ED] px-6 py-4">
          <h2
            id="cancel-booking-title"
            className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]"
          >
            Cancel Booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="cursor-pointer text-[#9AA1B9] transition-colors hover:text-[#2A2E3F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 py-6 [font-family:var(--font-inter)] text-base leading-7 text-[#646D89]">
          {copy.body}
        </p>

        {error ? (
          <p className="px-6 pb-4 [font-family:var(--font-inter)] text-sm text-[#B61515]">{error}</p>
        ) : null}

        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-[#C14817] bg-white px-6 py-3 [font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] transition-[background-color,transform] duration-150 hover:bg-[#FFF7F3] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Cancelling..." : copy.confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm bg-[#C14817] px-6 py-3 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            No, Don&apos;t Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
