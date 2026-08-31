import { isIsoDate, nightsBetween } from "@/features/booking/date-rules";
import type { AdminBookingEditPaymentMethod, AdminEditPaymentRequirement } from "@/types/admin-booking-edit";
import type { BookingStatus } from "@/types/booking";

export const EDITABLE_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "checked_in"];

export type AdminBookingEditBlockReason =
  | "status_not_editable"
  | "invalid_dates"
  | "nights_reduced"
  | "check_in_locked"
  | "checkout_not_extended"
  | "not_an_upgrade";

export type AdminDateChangeValidation =
  | { ok: true; previousNights: number; nextNights: number; nightsAdded: number }
  | { ok: false; reason: AdminBookingEditBlockReason; message: string };

export type RoomUpgradeValidation =
  | { ok: true; previousRoomSubtotal: number; nextRoomSubtotal: number; difference: number }
  | { ok: false; reason: AdminBookingEditBlockReason; message: string };

export function isAdminBookingEditable(status: BookingStatus): boolean {
  return EDITABLE_BOOKING_STATUSES.includes(status);
}

export function getAdminBookingEditBlockMessage(status: BookingStatus): string | null {
  if (isAdminBookingEditable(status)) return null;
  return "Only confirmed or checked-in bookings can be edited";
}

export function validateAdminDateChange(params: {
  status: BookingStatus;
  currentCheckIn: string;
  currentCheckOut: string;
  newCheckIn: string;
  newCheckOut: string;
}): AdminDateChangeValidation {
  const statusMessage = getAdminBookingEditBlockMessage(params.status);
  if (statusMessage) {
    return { ok: false, reason: "status_not_editable", message: statusMessage };
  }

  if (
    !isIsoDate(params.newCheckIn) ||
    !isIsoDate(params.newCheckOut) ||
    !isIsoDate(params.currentCheckIn) ||
    !isIsoDate(params.currentCheckOut)
  ) {
    return {
      ok: false,
      reason: "invalid_dates",
      message: "Check-in and check-out must be valid dates (YYYY-MM-DD)",
    };
  }

  const previousNights = nightsBetween(params.currentCheckIn, params.currentCheckOut);
  const nextNights = nightsBetween(params.newCheckIn, params.newCheckOut);

  if (nextNights < 1) {
    return {
      ok: false,
      reason: "invalid_dates",
      message: "Check-out must be at least one night after check-in",
    };
  }

  if (nextNights < previousNights) {
    return {
      ok: false,
      reason: "nights_reduced",
      message: "Stay length cannot be shortened — you can shift dates or add nights only",
    };
  }

  if (params.status === "checked_in") {
    if (params.newCheckIn !== params.currentCheckIn) {
      return {
        ok: false,
        reason: "check_in_locked",
        message: "Check-in date cannot change after the guest has checked in",
      };
    }

    if (params.newCheckOut <= params.currentCheckOut) {
      return {
        ok: false,
        reason: "checkout_not_extended",
        message: "Check-out must be extended — it cannot stay the same or move earlier",
      };
    }
  }

  return {
    ok: true,
    previousNights,
    nextNights,
    nightsAdded: nextNights - previousNights,
  };
}

export function validateRoomUpgrade(currentRoomSubtotal: number, nextRoomSubtotal: number): RoomUpgradeValidation {
  if (nextRoomSubtotal <= currentRoomSubtotal) {
    return {
      ok: false,
      reason: "not_an_upgrade",
      message: "Room changes must be an upgrade to a more expensive option",
    };
  }

  return {
    ok: true,
    previousRoomSubtotal: currentRoomSubtotal,
    nextRoomSubtotal: nextRoomSubtotal,
    difference: nextRoomSubtotal - currentRoomSubtotal,
  };
}

export function calculateEditPriceDifference(previousTotal: number, nextTotal: number): number {
  return Math.max(0, nextTotal - previousTotal);
}

export function resolveEditPaymentRequirement(
  paymentMethod: AdminBookingEditPaymentMethod,
  difference: number,
): AdminEditPaymentRequirement {
  if (difference <= 0) {
    return { requiresPayment: false };
  }

  if (paymentMethod === "credit_card") {
    return {
      requiresPayment: true,
      amount: difference,
      channel: "stripe",
      paymentStatus: "pending",
    };
  }

  return {
    requiresPayment: true,
    amount: difference,
    channel: "pay_at_hotel",
    paymentStatus: "pay_at_hotel",
  };
}
