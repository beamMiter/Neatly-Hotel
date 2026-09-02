"use client";

import { useEffect, useState } from "react";
import { BagIcon } from "@/components/icons/BagIcon";
import { formatDateLabel, formatThb } from "@/features/booking/format";
import type { SelectedSpecialRequest } from "@/types/booking";

type BookingSummaryPanelProps = {
  roomName: string;
  checkIn: string;
  checkOut: string;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
  guests: number;
  nights: number;
  rooms: number;
  roomSubtotal: number;
  selectedAddons: SelectedSpecialRequest[];
  discountAmount: number;
  totalAmount: number;
};

const SESSION_SECONDS = 5 * 60;

function formatCountdown(seconds: number): string {
  const clamped = Math.max(seconds, 0);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function BookingSummaryPanel({
  roomName,
  checkIn,
  checkOut,
  checkInTimeLabel,
  checkOutTimeLabel,
  guests,
  nights,
  rooms,
  roomSubtotal,
  selectedAddons,
  discountAmount,
  totalAmount,
}: BookingSummaryPanelProps) {
  // Visual-only session timer for filling out the wizard — unrelated to
  // the 30-minute payment hold, which only starts once a booking row
  // actually exists (i.e. after "Confirm Booking" is submitted).
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-[358px]">
      <div className="flex flex-col overflow-hidden rounded bg-[#465C50]">
        <div className="flex items-center justify-between bg-[#2F3E35] px-6 py-4">
          <div className="flex items-center gap-3">
            <BagIcon className="h-6 w-6 text-[#81A08F]" />
            <h3 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold text-white">
              Booking Detail
            </h3>
          </div>
          <span className="rounded bg-[#F9DACE] px-2 py-1 [font-family:var(--font-inter)] text-sm font-medium leading-[17px] text-[#803010]">
            {formatCountdown(secondsLeft)}
          </span>
        </div>

        <div className="flex flex-col gap-10 p-6">
          <div className="flex gap-6">
            <div className="flex flex-1 flex-col gap-2">
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                Check-in
              </p>
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                After {checkInTimeLabel}
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                Check-out
              </p>
              <p className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
                Before {checkOutTimeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="py-1 [font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
              {formatDateLabel(checkIn)} &ndash; {formatDateLabel(checkOut)}
            </p>
            <p className="py-1 [font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
              {guests} Guest{guests === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                {roomName}
                {rooms > 1 ? ` × ${rooms}` : ""} · {nights} night{nights === 1 ? "" : "s"}
              </span>
              <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {formatThb(roomSubtotal)}
              </span>
            </div>

            {selectedAddons.map((addon) => (
              <div key={addon.code} className="flex items-baseline justify-between gap-4 -mt-4">
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  {addon.label}
                  {addon.quantity > 1 ? ` × ${addon.quantity}` : ""}
                </span>
                <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  {formatThb(addon.price * addon.quantity)}
                </span>
              </div>
            ))}

            {discountAmount > 0 && (
              <div className="flex items-baseline justify-between gap-4 -mt-4">
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                  Promotion Code
                </span>
                <span className="shrink-0 [font-family:var(--font-inter)] text-base leading-[150%] font-semibold tracking-[-0.02em] text-white">
                  -{formatThb(discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-4 border-t border-[#5D7B6A] pt-6">
              <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#D5DFDA]">
                Total
              </span>
              <span className="shrink-0 [font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
                {formatThb(Math.max(totalAmount, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-5 bg-[#E4E6ED] p-4">
        <li className="flex items-start gap-2">
          <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-[#5D7B6A]" />
          <p className="[font-family:var(--font-inter)] text-xs leading-[150%] font-medium tracking-[-0.02em] text-[#5D7B6A]">
            Cancel booking will get full refund if the cancelation occurs within 72 hours (3 days) of the booking date.
          </p>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-[#5D7B6A]" />
          <p className="[font-family:var(--font-inter)] text-xs leading-[150%] font-medium tracking-[-0.02em] text-[#5D7B6A]">
            Able to change check-in or check-out date booking within 24 hours of the booking date.
          </p>
        </li>
      </ul>
    </aside>
  );
}
