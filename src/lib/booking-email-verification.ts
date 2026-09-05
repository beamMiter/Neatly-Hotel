export const BOOKING_EMAIL_VERIFICATION_HEADER = "x-email-verification-token";

export function bookingEmailVerificationStorageKey(bookingId: string) {
  return `neatly-booking-email-verification:${bookingId}`;
}
