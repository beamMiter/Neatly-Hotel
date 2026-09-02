import { isChangeDateEligible, isRefundEligible } from "@/features/booking/date-rules";
import type { BookingHistoryItem, BookingPayment } from "@/types/booking";

export type BookingCancelType = "refundable" | "non-refundable";

export type BookingActions = {
  showChangeDate: boolean;
  showCancel: boolean;
  showRoomDetail: boolean;
  cancelType: BookingCancelType | null;
};

const BANGKOK_OFFSET = "+07:00";
const DAY_MS = 24 * 60 * 60 * 1000;

const BANGKOK_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

export const CHECK_IN_TIME_LABEL = "After 2:00 PM";
export const CHECK_OUT_TIME_LABEL = "Before 12:00 PM";

/** Interpret a YYYY-MM-DD stay date as midnight in Asia/Bangkok. */
export function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${BANGKOK_OFFSET}`);
}

export function formatBookingDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", BANGKOK_DATE_FORMAT).format(new Date(iso));
}

export function formatStayDate(isoDate: string): string {
  return formatBookingDate(`${isoDate}T12:00:00${BANGKOK_OFFSET}`);
}

export function formatPaymentMethod(payment: BookingPayment): string {
  return `Credit Card - *${payment.lastDigits}`;
}

export function getBookingActions(
  booking: Pick<BookingHistoryItem, "status" | "bookingCreatedAt" | "checkInDate" | "checkOutDate">,
  now = new Date(),
): BookingActions {
  if (booking.status === "cancelled") {
    return {
      showChangeDate: false,
      showCancel: false,
      showRoomDetail: false,
      cancelType: null,
    };
  }

  // Once the check-out day itself has fully passed, cancelling (or
  // changing dates) no longer makes sense regardless of check-in status.
  const pastCheckOut = now.getTime() >= parseLocalDate(booking.checkOutDate).getTime() + DAY_MS;

  if (booking.status === "checked_in" || pastCheckOut) {
    return {
      showChangeDate: false,
      showCancel: false,
      showRoomDetail: true,
      cancelType: null,
    };
  }

  const cancelType: BookingCancelType = isRefundEligible(booking.bookingCreatedAt, now)
    ? "refundable"
    : "non-refundable";

  return {
    showChangeDate: isChangeDateEligible(booking.bookingCreatedAt, now),
    showCancel: true,
    showRoomDetail: true,
    cancelType,
  };
}
