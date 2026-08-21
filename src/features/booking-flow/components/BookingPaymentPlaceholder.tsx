"use client";

import type { BookingDraft } from "@/features/booking-flow/types";

type BookingPaymentPlaceholderProps = {
  draft: BookingDraft;
};

export function BookingPaymentPlaceholder({ draft }: BookingPaymentPlaceholderProps) {
  return (
    <div className="space-y-4">
      <h2 className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]">Payment Method</h2>
      <div className="rounded-md border border-dashed border-[#D6D9E4] bg-[#F7F7FB] px-4 py-6 text-sm text-[#646D89]">
        <p className="font-medium text-[#2A2E3F]">Ready for payment handoff</p>
        <p className="mt-2">
          Booking draft for <span className="font-medium text-[#2A2E3F]">{draft.roomTypeName}</span> has been saved
          for the payment step.
        </p>
        <p className="mt-2">
          Total before promotion:{" "}
          <span className="font-semibold text-[#2A2E3F]">
            THB {draft.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
      </div>
    </div>
  );
}
