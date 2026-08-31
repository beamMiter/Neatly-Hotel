"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { resolveAddOnQuantity } from "@/lib/addon-pricing";
import { isAdminBookingEditable } from "@/lib/admin-booking-edit";
import { SpecialRequestStep } from "@/features/booking/components/steps/SpecialRequestStep";
import type { SpecialRequestOption } from "@/types/booking";
import type { CustomerBookingDetail } from "@/types/customer-booking";

type EditSpecialRequestsModalProps = {
  booking: CustomerBookingDetail;
  catalog: SpecialRequestOption[];
  onClose: () => void;
};

function formatThb(amount: number) {
  return `THB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EditSpecialRequestsModal({ booking, catalog, onClose }: EditSpecialRequestsModalProps) {
  const router = useRouter();
  const [standardRequests, setStandardRequests] = useState<string[]>(booking.standardRequestCodes);
  const [specialRequestSelections, setSpecialRequestSelections] = useState<Record<string, number>>(
    booking.specialRequestSelections,
  );
  const [additionalRequest, setAdditionalRequest] = useState(booking.additionalRequest ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "cash">(booking.paymentMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSubmitting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  const estimatedAddonsTotal = useMemo(() => {
    return catalog
      .filter((option) => option.category === "special" && option.code in specialRequestSelections)
      .reduce((sum, option) => {
        const quantity = resolveAddOnQuantity(
          option.billingType,
          specialRequestSelections[option.code],
          booking.nights,
        );
        return sum + option.price * quantity;
      }, 0);
  }, [catalog, specialRequestSelections, booking.nights]);

  const estimatedTotal = booking.roomSubtotal + estimatedAddonsTotal - booking.discountAmount;
  const estimatedDifference = Math.max(0, estimatedTotal - booking.totalAmount);
  const requiresPaymentMethod = estimatedDifference > 0;

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        standardRequests,
        specialRequests: Object.entries(specialRequestSelections).map(([code, count]) => ({ code, count })),
        additionalRequest: additionalRequest.trim() || null,
      };

      if (requiresPaymentMethod) {
        payload.paymentMethod = paymentMethod;
      }

      const response = await fetch(`/api/admin/bookings/${booking.id}/special-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.message ?? "Failed to update special requests");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Failed to update special requests");
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
        aria-labelledby="edit-special-requests-title"
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 id="edit-special-requests-title" className="text-lg font-semibold text-brand-body">
            Edit special requests
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
          <SpecialRequestStep
            catalog={catalog}
            standardRequests={standardRequests}
            specialRequestSelections={specialRequestSelections}
            nights={booking.nights}
            additionalRequest={additionalRequest}
            onToggleStandard={(code) =>
              setStandardRequests((current) =>
                current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
              )
            }
            onSpecialCountChange={(code, count) =>
              setSpecialRequestSelections((current) => {
                const next = { ...current };
                if (count <= 0) {
                  delete next[code];
                } else {
                  next[code] = count;
                }
                return next;
              })
            }
            onAdditionalRequestChange={setAdditionalRequest}
            onBack={onClose}
            onNext={handleSave}
            showActions={false}
          />

          {requiresPaymentMethod && (
            <div className="mt-6 flex flex-col gap-3 rounded-md border border-brand-border bg-brand-surface px-5 py-4">
              <p className="text-sm text-brand-body">
                Additional amount due: <span className="font-semibold">{formatThb(estimatedDifference)}</span>
              </p>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-brand-body">Payment for the difference</legend>
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
            </div>
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
            disabled={isSubmitting}
            onClick={handleSave}
            className="h-11 rounded bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

type BookingSpecialRequestsSectionProps = {
  booking: CustomerBookingDetail;
  catalog: SpecialRequestOption[];
};

export function BookingSpecialRequestsSection({ booking, catalog }: BookingSpecialRequestsSectionProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const canEdit = isAdminBookingEditable(booking.status);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-brand-muted">Requests & add-ons</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
            >
              Edit
            </button>
          )}
        </div>

        {booking.standardRequests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {booking.standardRequests.map((label) => (
              <span
                key={label}
                className="rounded-full bg-brand-surface-alt px-3 py-1 text-xs text-brand-body"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {booking.specialRequests.length === 0 && booking.standardRequests.length === 0 && !booking.additionalRequest && (
          <p className="text-sm text-brand-muted">No special requests</p>
        )}
      </div>

      {isEditOpen && (
        <EditSpecialRequestsModal
          booking={booking}
          catalog={catalog}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}
