// ── ChangeDateView ───────────────────────────────────────────────────
// Client half of /change-date — real booking passed down from page.tsx
// (server component, does the DB fetch). Picker still locks nights to the
// original stay length; submit now calls the real change-date API instead
// of the old mock no-op.

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ChangeDatePicker from "@/components/shared/ChangeDatePicker";
import ChangeDateConfirmModal from "@/components/shared/ChangeDateConfirmModal";

// ── Data ───────────────────────────────────────────────────────
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

type ChangeDateViewProps = {
  bookingId: string;
  roomName: string;
  roomImageUrl: string;
  bookingCreatedAt: string;
  checkIn: string;
  checkOut: string;
  successHref: string;
};

const toDateOnly = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date: Date) => {
  const weekday = WEEKDAY_SHORT[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()];
  return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
};

// ── Component ──────────────────────────────────────────────────
const ChangeDateView = ({
  bookingId,
  roomName,
  roomImageUrl,
  bookingCreatedAt,
  checkIn,
  checkOut,
  successHref,
}: ChangeDateViewProps) => {
  const router = useRouter();
  const originalCheckIn = toDateOnly(checkIn);
  const originalCheckOut = toDateOnly(checkOut);
  const nights = Math.round(
    (originalCheckOut.getTime() - originalCheckIn.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const [newCheckIn, setNewCheckIn] = useState(originalCheckIn);
  const [newCheckOut, setNewCheckOut] = useState(originalCheckOut);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (nextCheckIn: Date, nextCheckOut: Date) => {
    setNewCheckIn(nextCheckIn);
    setNewCheckOut(nextCheckOut);
  };

  const handleCancel = () => {
    router.push("/booking-history");
  };

  const handleConfirmChange = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/change-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: toIsoDate(newCheckIn),
          checkOut: toIsoDate(newCheckOut),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ??
            "Unable to change your booking dates. Please try again.",
        );
        return;
      }

      router.push(successHref);
    } catch {
      setError("Unable to change your booking dates. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <main className="flex-1 bg-[#F7F7FB] pb-20">
        <div className="mx-auto max-w-280 px-6 pt-20 lg:px-10">
          <h1 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] leading-[125%] tracking-[-0.02em] text-[#465C50] lg:text-[68px]">
            Change Check-in and Check-out Date
          </h1>

          <div className="mt-20 flex flex-col gap-8 py-10 lg:flex-row">
            <div className="relative h-52.5 w-full flex-none overflow-hidden rounded lg:h-52.5 lg:w-89.25">
              <Image
                src={roomImageUrl}
                alt={roomName}
                fill
                sizes="360px"
                className="object-cover"
              />
            </div>

            <div className="flex w-full flex-1 flex-col gap-8">
              <div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
                <h2 className="[font-family:var(--font-inter)] text-2xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
                  {roomName}
                </h2>
                <span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]">
                  Booking date: {formatDate(new Date(bookingCreatedAt))}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="[font-family:var(--font-inter)] text-base font-semibold tracking-[-0.02em] text-[#424C6B]">
                  Original Date
                </span>
                <p className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
                  {formatDate(originalCheckIn)} - {formatDate(originalCheckOut)}{" "}
                  ({nights} nights)
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded bg-white p-4">
                <span className="[font-family:var(--font-inter)] text-base font-semibold tracking-[-0.02em] text-[#424C6B]">
                  Change Date
                </span>

                <ChangeDatePicker
                  nights={nights}
                  checkIn={newCheckIn}
                  checkOut={newCheckOut}
                  onChange={handleDateChange}
                />
              </div>

              {error ? (
                <p className="[font-family:var(--font-inter)] text-sm text-[#B61515]">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-[#E4E6ED] py-10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors duration-150 hover:text-[#C14817] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!newCheckIn || !newCheckOut || isSubmitting}
              onClick={() => setIsConfirmOpen(true)}
              className="flex h-12 w-57.5 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90 disabled:cursor-default disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>
      </main>

      <ChangeDateConfirmModal
        open={isConfirmOpen}
        isSubmitting={isSubmitting}
        onClose={() => (isSubmitting ? null : setIsConfirmOpen(false))}
        onConfirm={handleConfirmChange}
      />
    </>
  );
};

export default ChangeDateView;
