// ── RefundReceiptView ────────────────────────────────────────────────
// Client half of /refund — second (detailed) confirmation step for a
// refund-eligible cancellation. Shows the confirm card first; its confirm
// button is what actually calls the cancel API. On success, swaps in
// BookingCancelSuccessCard in place (no further redirect) — branching on
// the *actual* `refunded` result returned by the API, not just on being on
// this route, since a booking's eligibility could in principle have
// crossed the 3-day boundary between the first confirm step and this one.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingCancelConfirmCard } from "@/features/booking-history/components/BookingCancelConfirmCard";
import { BookingCancelSuccessCard } from "@/features/booking-history/components/BookingCancelSuccessCard";
import type { BookingRecord } from "@/types/booking";

type CancelResponse = { message: string; booking: BookingRecord; refunded: boolean };

type RefundReceiptViewProps = {
  bookingId: string;
  roomName: string;
  imageUrl: string;
  bookingCreatedAt: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  initialPhase: "confirm" | "success";
  initialRefunded: boolean;
  initialCancelledAt: string | null;
};

const RefundReceiptView = ({
  bookingId,
  roomName,
  imageUrl,
  bookingCreatedAt,
  checkIn,
  checkOut,
  guests,
  totalAmount,
  initialPhase,
  initialRefunded,
  initialCancelledAt,
}: RefundReceiptViewProps) => {
  const router = useRouter();
  const [phase, setPhase] = useState<"confirm" | "success">(initialPhase);
  const [refunded, setRefunded] = useState(initialRefunded);
  const [cancelledAt, setCancelledAt] = useState(initialCancelledAt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as CancelResponse | { message?: string } | null;

      if (!response.ok) {
        setError(data?.message ?? "Unable to cancel this booking. Please try again.");
        return;
      }

      const result = data as CancelResponse;
      setRefunded(Boolean(result.refunded));
      setCancelledAt(result.booking.cancelledAt);
      setPhase("success");
    } catch {
      setError("Unable to cancel this booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === "confirm") {
    return (
      <main className="flex-1 bg-[#F7F7FB] pb-20">
        <BookingCancelConfirmCard
          variant="refundable"
          roomTypeName={roomName}
          imageUrl={imageUrl}
          bookingCreatedAt={bookingCreatedAt}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          totalAmount={totalAmount}
          isSubmitting={isSubmitting}
          error={error}
          onCancel={() => router.push("/booking-history")}
          onConfirm={handleConfirm}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F7F7FB] pb-20">
      <BookingCancelSuccessCard
        roomTypeName={roomName}
        bookingCreatedAt={bookingCreatedAt}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        cancelledAt={cancelledAt ?? bookingCreatedAt}
        refunded={refunded}
        totalAmount={totalAmount}
      />
    </main>
  );
};

export default RefundReceiptView;
