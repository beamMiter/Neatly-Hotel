"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerBookingDetail } from "@/types/customer-booking";

type BookingStayActionsProps = {
  booking: CustomerBookingDetail;
};

export function BookingStayActions({ booking }: BookingStayActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"check-in" | "check-out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentOk =
    booking.paymentStatus === "paid" || booking.paymentStatus === "pay_at_hotel";
  const canCheckIn = booking.status === "confirmed" && paymentOk;
  const canCheckOut = booking.status === "checked_in";
  const waitingOnPayment = booking.status === "confirmed" && !paymentOk;

  if (!canCheckIn && !canCheckOut && !waitingOnPayment) {
    return null;
  }

  async function runAction(action: "check-in" | "check-out") {
    setError(null);
    setPendingAction(action);

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/${action}`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.message ?? `Failed to ${action.replace("-", " ")}`);
        return;
      }

      router.refresh();
    } catch {
      setError(`Failed to ${action.replace("-", " ")}`);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-brand-border pt-6">
      <div className="flex flex-wrap gap-3">
        {canCheckIn && (
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => runAction("check-in")}
            className="h-11 rounded bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "check-in" ? "Checking in..." : "Check in"}
          </button>
        )}

        {canCheckOut && (
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => runAction("check-out")}
            className="h-11 rounded bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "check-out" ? "Checking out..." : "Check out"}
          </button>
        )}
      </div>

      {waitingOnPayment && (
        <p className="text-sm text-brand-muted">Check-in is available after payment is confirmed.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
