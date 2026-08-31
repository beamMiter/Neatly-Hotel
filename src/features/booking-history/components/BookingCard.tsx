"use client";

import { useState } from "react";
import Link from "next/link";
import { RoomImagePlaceholder } from "@/features/booking/components/RoomImagePlaceholder";
import { BookingDetailDropdown } from "@/features/booking-history/components/BookingDetailDropdown";
import {
  CHECK_IN_TIME_LABEL,
  CHECK_OUT_TIME_LABEL,
  formatBookingDate,
  formatStayDate,
  getBookingActions,
} from "@/lib/booking-actions";
import type { BookingHistoryItem } from "@/types/booking";

type BookingCardProps = {
  booking: BookingHistoryItem;
  onCancel: (booking: BookingHistoryItem) => void;
};

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const actions = getBookingActions(booking);
  const showFooter = actions.showCancel || actions.showRoomDetail || actions.showChangeDate;

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(240px,357px)_minmax(0,1fr)] lg:gap-10">
      <RoomImagePlaceholder
        label={booking.roomTypeName}
        src={booking.imageUrl}
        className="aspect-4/3 w-full rounded-sm lg:min-h-55"
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <h2 className="[font-family:var(--font-noto-serif)] text-2xl font-medium tracking-[-0.02em] text-[#2A2E3F] lg:text-[28px]">
            {booking.roomTypeName}
          </h2>
          <div className="shrink-0 text-sm text-[#9AA1B9] sm:text-right">
            <p>Booking code: {booking.bookingCode}</p>
            <p className="mt-1">Booking date: {formatBookingDate(booking.bookingCreatedAt)}</p>
            {booking.status === "cancelled" && booking.cancelledAt ? (
              <p className="mt-1">Cancellation date: {formatBookingDate(booking.cancelledAt)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-10">
          <div>
            <p className="text-sm font-semibold text-[#2A2E3F]">Check-in</p>
            <p className="mt-1 text-sm text-[#646D89]">
              {formatStayDate(booking.checkInDate)} | {CHECK_IN_TIME_LABEL}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2A2E3F]">Check-out</p>
            <p className="mt-1 text-sm text-[#646D89]">
              {formatStayDate(booking.checkOutDate)} | {CHECK_OUT_TIME_LABEL}
            </p>
          </div>
        </div>

        <BookingDetailDropdown
          booking={booking}
          open={detailOpen}
          onToggle={() => setDetailOpen((current) => !current)}
        />

        {showFooter ? (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {actions.showCancel ? (
                <button
                  type="button"
                  onClick={() => onCancel(booking)}
                  className="cursor-pointer [font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] hover:text-[#A93F13]"
                >
                  Cancel Booking
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              {actions.showRoomDetail ? (
                <Link
                  href={`/rooms/${booking.roomTypeId}`}
                  className="[font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] hover:text-[#A93F13]"
                >
                  Room Detail
                </Link>
              ) : null}
              {actions.showChangeDate ? (
                <Link
                  href={`/change-date?bookingId=${booking.id}`}
                  className="flex h-12 items-center justify-center rounded-sm bg-[#C14817] px-8 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13]"
                >
                  Change Date
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
