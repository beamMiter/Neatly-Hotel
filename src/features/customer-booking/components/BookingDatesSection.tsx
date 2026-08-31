"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { nightsBetween } from "@/features/booking/date-rules";
import { resolveAddOnQuantity } from "@/lib/addon-pricing";
import {
  getAdminEditPaymentAmount,
  getAdminEditPaymentLabel,
  getAdminEditPaymentLegend,
  isAdminBookingEditable,
  isUnpaidPendingPaymentBooking,
  validateAdminDateChange,
} from "@/lib/admin-booking-edit";
import type { SpecialRequestOption } from "@/types/booking";
import type { CustomerBookingDetail } from "@/types/customer-booking";

type BookingDatesSectionProps = {
  booking: CustomerBookingDetail;
  catalog: SpecialRequestOption[];
};

function formatThb(amount: number) {
  return `THB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDisplayDate(isoDate: string) {
  return format(new Date(isoDate), "EEE, d MMM yyyy");
}

function toDateInputValue(isoDate: string) {
  return isoDate.slice(0, 10);
}

function EditDatesModal({
  booking,
  catalog,
  onClose,
}: {
  booking: CustomerBookingDetail;
  catalog: SpecialRequestOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isCheckedIn = booking.status === "checked_in";
  const bookingCheckIn = toDateInputValue(booking.checkIn);
  const bookingCheckOut = toDateInputValue(booking.checkOut);
  const [checkIn, setCheckIn] = useState(bookingCheckIn);
  const [checkOut, setCheckOut] = useState(bookingCheckOut);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "cash">(booking.paymentMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (isSubmitting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  const dateValidation = useMemo(
    () =>
      validateAdminDateChange({
        status: booking.status,
        currentCheckIn: bookingCheckIn,
        currentCheckOut: bookingCheckOut,
        newCheckIn: checkIn,
        newCheckOut: checkOut,
      }),
    [booking.status, bookingCheckIn, bookingCheckOut, checkIn, checkOut],
  );

  const nextNights = dateValidation.ok ? dateValidation.nextNights : booking.nights;
  const perNightRoomRate = booking.nights > 0 ? booking.roomSubtotal / booking.nights : 0;

  const estimatedAddonsTotal = useMemo(() => {
    return catalog
      .filter((option) => option.category === "special" && option.code in booking.specialRequestSelections)
      .reduce((sum, option) => {
        const quantity = resolveAddOnQuantity(
          option.billingType,
          booking.specialRequestSelections[option.code],
          nextNights,
        );
        return sum + option.price * quantity;
      }, 0);
  }, [catalog, booking.specialRequestSelections, nextNights]);

  const estimatedTotal = perNightRoomRate * nextNights + estimatedAddonsTotal - booking.discountAmount;
  const estimatedDifference = Math.max(0, estimatedTotal - booking.totalAmount);
  const datesUnchanged = checkIn === bookingCheckIn && checkOut === bookingCheckOut;
  const showPaymentSection =
    !datesUnchanged && dateValidation.ok && estimatedDifference > 0;

  async function handleSave() {
    if (!dateValidation.ok) {
      setError(dateValidation.message);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = { checkIn, checkOut };
      if (showPaymentSection && !isUnpaidPendingPaymentBooking(booking.status)) {
        payload.paymentMethod = paymentMethod;
      }

      const response = await fetch(`/api/admin/bookings/${booking.id}/dates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.message ?? "Failed to update booking dates");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Failed to update booking dates");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dates-title"
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 id="edit-dates-title" className="text-lg font-semibold text-brand-body">
            Edit stay dates
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-brand-muted transition-colors hover:text-brand-body disabled:opacity-60"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-4 text-sm text-brand-muted">
            {isCheckedIn
              ? "Guest is checked in — you can extend check-out only."
              : "You can shift dates or add nights. Shortening the stay is not allowed."}
          </p>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-brand-muted">Check-in</span>
              {isCheckedIn ? (
                <span className="rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-body">
                  {formatDisplayDate(checkIn)}
                </span>
              ) : (
                <input
                  type="date"
                  value={checkIn}
                  onChange={(event) => {
                    const nextCheckIn = event.target.value;
                    setCheckIn(nextCheckIn);
                    const currentNights = Math.max(nightsBetween(nextCheckIn, checkOut), 1);
                    if (currentNights < booking.nights) {
                      const minCheckOut = new Date(`${nextCheckIn}T00:00:00.000Z`);
                      minCheckOut.setUTCDate(minCheckOut.getUTCDate() + booking.nights);
                      setCheckOut(minCheckOut.toISOString().slice(0, 10));
                    }
                  }}
                  disabled={isSubmitting}
                  className="rounded border border-brand-border px-3 py-2 text-sm text-brand-body"
                />
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-brand-muted">Check-out</span>
              <input
                type="date"
                value={checkOut}
                min={
                  isCheckedIn
                    ? (() => {
                        const min = new Date(`${bookingCheckOut}T00:00:00.000Z`);
                        min.setUTCDate(min.getUTCDate() + 1);
                        return min.toISOString().slice(0, 10);
                      })()
                    : (() => {
                        const min = new Date(`${checkIn}T00:00:00.000Z`);
                        min.setUTCDate(min.getUTCDate() + booking.nights);
                        return min.toISOString().slice(0, 10);
                      })()
                }
                onChange={(event) => setCheckOut(event.target.value)}
                disabled={isSubmitting}
                className="rounded border border-brand-border px-3 py-2 text-sm text-brand-body"
              />
            </label>

            <p className="text-sm text-brand-body">
              Stay length:{" "}
              <span className="font-semibold">
                {nextNights} night{nextNights === 1 ? "" : "s"}
              </span>
              {dateValidation.ok && dateValidation.nightsAdded > 0 && (
                <span className="text-brand-muted"> (+{dateValidation.nightsAdded} added)</span>
              )}
            </p>
          </div>

          {showPaymentSection && (
            <div className="mt-6 flex flex-col gap-3 rounded-md border border-brand-border bg-brand-surface px-5 py-4">
              <p className="text-sm text-brand-body">
                {getAdminEditPaymentLabel(booking.status)}:{" "}
                <span className="font-semibold">
                  {formatThb(getAdminEditPaymentAmount(booking.status, estimatedTotal, estimatedDifference))}
                </span>
              </p>
              {!isUnpaidPendingPaymentBooking(booking.status) && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium text-brand-body">
                    {getAdminEditPaymentLegend(booking.status)}
                  </legend>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-body">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === "credit_card"}
                      onChange={() => setPaymentMethod("credit_card")}
                      disabled={isSubmitting}
                    />
                    Credit card (Stripe)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-body">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      disabled={isSubmitting}
                    />
                    Pay at hotel
                  </label>
                </fieldset>
              )}
            </div>
          )}

          {!dateValidation.ok && (
            <p className="mt-4 text-sm text-amber-700">{dateValidation.message}</p>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-11 rounded border border-brand-border px-6 text-sm font-semibold text-brand-body disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !dateValidation.ok || datesUnchanged}
            onClick={handleSave}
            className="h-11 rounded bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save dates"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookingDatesSection({ booking, catalog }: BookingDatesSectionProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const canEdit = isAdminBookingEditable(booking.status);
  const modalKey = `${booking.id}-${toDateInputValue(booking.checkIn)}-${toDateInputValue(booking.checkOut)}-${booking.totalAmount}-${booking.roomSubtotal}`;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-brand-muted">Check-in</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
              >
                Edit dates
              </button>
            )}
          </div>
          <span className="text-sm text-brand-body">{formatDisplayDate(booking.checkIn)}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-brand-muted">Check-out</span>
          <span className="text-sm text-brand-body">{formatDisplayDate(booking.checkOut)}</span>
        </div>
      </div>

      {isEditOpen && (
        <EditDatesModal
          key={modalKey}
          booking={booking}
          catalog={catalog}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}
