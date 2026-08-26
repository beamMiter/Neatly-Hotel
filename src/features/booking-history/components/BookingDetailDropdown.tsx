"use client";

import { useId } from "react";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { formatThb } from "@/features/booking/format";
import { formatPaymentMethod } from "@/lib/booking-actions";
import type { BookingHistoryItem } from "@/types/booking";

type BookingDetailDropdownProps = {
  booking: BookingHistoryItem;
  open: boolean;
  onToggle: () => void;
};

function formatLineAmount(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

export function BookingDetailDropdown({ booking, open, onToggle }: BookingDetailDropdownProps) {
  const panelId = useId();
  const nightLabel = booking.nights === 1 ? "Night" : "Nights";
  const guestLabel = booking.guests === 1 ? "Guest" : "Guests";

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between bg-[#F1F2F6] px-4 py-3 text-left [font-family:var(--font-inter)] text-sm font-medium text-[#2A2E3F]"
      >
        <span>Booking Detail</span>
        <ChevronDownIcon
          className={`h-5 w-5 text-[#646D89] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id={panelId} className="px-1 py-6 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-[#2A2E3F]">
              {booking.guests} {guestLabel} ({booking.nights} {nightLabel})
            </p>
            <p className="text-sm text-[#646D89] sm:text-right">
              Payment success via{" "}
              <span className="font-medium text-[#2A2E3F]">{formatPaymentMethod(booking.payment)}</span>
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {booking.lineItems.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-[#646D89]">{item.label}</span>
                <span
                  className={`shrink-0 font-medium ${item.amount < 0 ? "text-[#C14817]" : "text-[#2A2E3F]"}`}
                >
                  {formatLineAmount(item.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#E4E6ED] pt-5">
            <span className="text-base font-semibold text-[#2A2E3F]">Total</span>
            <span className="text-base font-semibold text-[#2A2E3F]">{formatThb(booking.totalAmount)}</span>
          </div>

          {booking.additionalRequest ? (
            <div className="mt-6 rounded-sm bg-[#E8EEF4] px-4 py-4">
              <p className="text-sm font-medium text-[#2A2E3F]">Additional Request</p>
              <p className="mt-2 text-sm leading-6 text-[#646D89]">{booking.additionalRequest}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
