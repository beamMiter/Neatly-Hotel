"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookingCard } from "@/features/booking-history/components/BookingCard";
import { CancelBookingModal } from "@/features/booking-history/components/CancelBookingModal";
import { getBookingActions } from "@/lib/booking-actions";
import type { BookingHistoryItem } from "@/types/booking";

const PAGE_SIZE = 4;

type BookingHistoryViewProps = {
  bookings: BookingHistoryItem[];
};

type CancelBookingResponse = {
  message: string;
  refunded: boolean;
};

export function BookingHistoryView({ bookings: initialBookings }: BookingHistoryViewProps) {
  const router = useRouter();
  const [bookings] = useState(initialBookings);
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<BookingHistoryItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = bookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cancelType = cancelTarget ? getBookingActions(cancelTarget).cancelType : null;

  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  function openCancelModal(booking: BookingHistoryItem) {
    setCancelError(null);
    setCancelTarget(booking);
  }

  function closeCancelModal() {
    if (isCancelling) return;
    setCancelTarget(null);
    setCancelError(null);
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/bookings/${cancelTarget.id}/cancel`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as CancelBookingResponse | { message?: string } | null;

      if (!response.ok) {
        setCancelError(data?.message ?? "Unable to cancel this booking. Please try again.");
        return;
      }

      const refunded = Boolean((data as CancelBookingResponse)?.refunded);
      router.push(refunded ? `/refund?bookingId=${cancelTarget.id}` : `/cancel-booking?bookingId=${cancelTarget.id}`);
    } catch {
      setCancelError("Unable to cancel this booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <div className="mx-auto px-4 py-10 sm:px-10 lg:px-40 lg:py-16">
        <h1 className="[font-family:var(--font-noto-serif)] text-4xl font-medium font-stretch-[87.5%] tracking-[-0.02em] text-[#2F3E35] lg:text-[44px]">
          Booking History
        </h1>

        {bookings.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#646D89]">
            You don&apos;t have any bookings yet.
          </p>
        ) : (
          <>
            <div className="mt-10 flex flex-col gap-10 lg:mt-16 lg:gap-16">
              {pageItems.map((booking, index) => (
                <BookingCard key={booking.id} booking={booking} onCancel={openCancelModal} index={index} />
              ))}
            </div>

            <nav className="flex items-center justify-center gap-1 py-10 lg:py-16" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-[background-color,transform] duration-150 hover:bg-[#F1F2F6] active:scale-90 disabled:pointer-events-none disabled:opacity-40"
              >
                <Image src="/icons/icon/arrow-left.svg" alt="" width={16} height={16} />
              </button>

              {pages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-sm transition-[background-color,transform] duration-150 active:scale-90 ${
                    pageNumber === currentPage
                      ? "bg-[#E4E6ED] font-medium text-[#2A2E3F]"
                      : "text-[#646D89] hover:bg-[#F1F2F6]"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-[background-color,transform] duration-150 hover:bg-[#F1F2F6] active:scale-90 disabled:pointer-events-none disabled:opacity-40"
              >
                <Image src="/icons/icon/arrow-right.svg" alt="" width={16} height={16} />
              </button>
            </nav>
          </>
        )}
      </div>

      {cancelType ? (
        <CancelBookingModal
          open={Boolean(cancelTarget)}
          variant={cancelType}
          isSubmitting={isCancelling}
          error={cancelError}
          onClose={closeCancelModal}
          onConfirm={handleConfirmCancel}
        />
      ) : null}
    </main>
  );
}
