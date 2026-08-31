"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { isAdminBookingEditable } from "@/lib/admin-booking-edit";
import type { AdminRoomUpgradeOption } from "@/types/admin-booking-edit";
import type { CustomerBookingDetail } from "@/types/customer-booking";

type BookingRoomUpgradeSectionProps = {
  booking: CustomerBookingDetail;
  upgradeOptions: AdminRoomUpgradeOption[];
};

function formatThb(amount: number) {
  return `THB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function UpgradeRoomModal({
  booking,
  upgradeOptions,
  onClose,
}: {
  booking: CustomerBookingDetail;
  upgradeOptions: AdminRoomUpgradeOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const availableOptions = upgradeOptions.filter((option) => option.available);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(availableOptions[0]?.roomTypeId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "cash">(booking.paymentMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = availableOptions.find((option) => option.roomTypeId === selectedRoomTypeId);
  const requiresPaymentMethod = (selectedOption?.totalDifference ?? 0) > 0;

  useEffect(() => {
    if (isSubmitting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  async function handleSave() {
    if (!selectedOption) {
      setError("Select an available upgrade option");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = { roomTypeId: selectedOption.roomTypeId };
      if (requiresPaymentMethod) {
        payload.paymentMethod = paymentMethod;
      }

      const response = await fetch(`/api/admin/bookings/${booking.id}/room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.message ?? "Failed to upgrade room");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Failed to upgrade room");
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
        aria-labelledby="upgrade-room-title"
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 id="upgrade-room-title" className="text-lg font-semibold text-brand-body">
            Upgrade room
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
            Only upgrades to a more expensive room type are allowed. Current room:{" "}
            <span className="font-medium text-brand-body">{booking.roomType}</span>
          </p>

          {availableOptions.length === 0 ? (
            <p className="text-sm text-brand-body">No upgrade options are available for this stay.</p>
          ) : (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium text-brand-body">Select upgrade</legend>
              {availableOptions.map((option) => (
                <label
                  key={option.roomTypeId}
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border px-4 py-3 ${
                    selectedRoomTypeId === option.roomTypeId
                      ? "border-brand-primary bg-brand-surface"
                      : "border-brand-border"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="roomTypeId"
                      value={option.roomTypeId}
                      checked={selectedRoomTypeId === option.roomTypeId}
                      onChange={() => setSelectedRoomTypeId(option.roomTypeId)}
                      disabled={isSubmitting}
                    />
                    <span className="font-medium text-brand-body">{option.roomTypeName}</span>
                  </span>
                  <span className="pl-6 text-sm text-brand-muted">
                    {formatThb(option.pricePerNight)}/night · additional{" "}
                    {formatThb(option.totalDifference)}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {upgradeOptions.some((option) => !option.available) && (
            <p className="mt-4 text-sm text-brand-muted">
              Some higher room types exist but are not available for these dates.
            </p>
          )}

          {requiresPaymentMethod && selectedOption && (
            <div className="mt-6 flex flex-col gap-3 rounded-md border border-brand-border bg-brand-surface px-5 py-4">
              <p className="text-sm text-brand-body">
                Additional amount due: <span className="font-semibold">{formatThb(selectedOption.totalDifference)}</span>
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
            disabled={isSubmitting || availableOptions.length === 0 || !selectedOption}
            onClick={handleSave}
            className="h-11 rounded bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Upgrading..." : "Confirm upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookingRoomUpgradeSection({
  booking,
  upgradeOptions,
}: BookingRoomUpgradeSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canEdit = isAdminBookingEditable(booking.status);
  const hasUpgradeOptions = upgradeOptions.some((option) => option.available);

  if (!canEdit) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-brand-muted">Room type</span>
          <span className="text-sm text-brand-body">{booking.roomType}</span>
        </div>
        <button
          type="button"
          disabled={!hasUpgradeOptions}
          onClick={() => setIsOpen(true)}
          className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover disabled:cursor-not-allowed disabled:text-brand-muted"
        >
          Upgrade room
        </button>
      </div>

      {isOpen && (
        <UpgradeRoomModal
          booking={booking}
          upgradeOptions={upgradeOptions}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
