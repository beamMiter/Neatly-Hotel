// Pure booking access rules — safe to import from scripts and server code.

export class BookingAccessDeniedError extends Error {
  readonly status = 403 as const;

  constructor() {
    super("Forbidden");
  }
}

/** Whether a viewer may read or mutate a booking they already resolved by id. */
export function canCustomerAccessBooking(
  bookingCustomerId: string | null,
  viewerId: string | null,
): boolean {
  // Guest checkout — the booking UUID (or code+email lookup) is the capability.
  if (bookingCustomerId === null) return true;
  return viewerId !== null && bookingCustomerId === viewerId;
}

export type BookingAccessOutcome = "allow" | "not_found" | "forbidden";

/** Maps existence + ownership to HTTP-style outcomes for customer-facing routes. */
export function resolveBookingAccessOutcome(
  bookingExists: boolean,
  bookingCustomerId: string | null,
  viewerId: string | null,
): BookingAccessOutcome {
  if (!bookingExists) return "not_found";
  if (!canCustomerAccessBooking(bookingCustomerId, viewerId)) {
    // Logged-in customer probing another member's booking → 403.
    // Anonymous probing a member booking → 404 (do not leak existence).
    if (viewerId !== null && bookingCustomerId !== null) return "forbidden";
    return "not_found";
  }
  return "allow";
}

/** Mirror of staff API auth — used by the authorization check script. */
export function resolveStaffAuthOutcome(hasSession: boolean, isActiveStaff: boolean): 401 | 403 | 200 {
  if (!hasSession) return 401;
  if (!isActiveStaff) return 403;
  return 200;
}
