/**
 * Offline checks for customer booking access + staff auth status codes.
 * Source of truth: src/lib/booking-access.ts (keep matrices in sync).
 */

function canCustomerAccessBooking(bookingCustomerId, viewerId) {
  if (bookingCustomerId === null) return true;
  return viewerId !== null && bookingCustomerId === viewerId;
}

function resolveBookingAccessOutcome(bookingExists, bookingCustomerId, viewerId) {
  if (!bookingExists) return "not_found";
  if (!canCustomerAccessBooking(bookingCustomerId, viewerId)) {
    if (viewerId !== null && bookingCustomerId !== null) return "forbidden";
    return "not_found";
  }
  return "allow";
}

function resolveStaffAuthOutcome(hasSession, isActiveStaff) {
  if (!hasSession) return 401;
  if (!isActiveStaff) return 403;
  return 200;
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS ${label}`);
}

// Guest booking — UUID holder may read (logged in or not).
assertEqual("guest booking anonymous viewer", canCustomerAccessBooking(null, null), true);
assertEqual("guest booking logged-in viewer", canCustomerAccessBooking(null, "user-a"), true);

// Member booking — owner only.
assertEqual("member booking owner", canCustomerAccessBooking("user-a", "user-a"), true);
assertEqual("member booking other customer", canCustomerAccessBooking("user-a", "user-b"), false);
assertEqual("member booking anonymous", canCustomerAccessBooking("user-a", null), false);

// HTTP outcomes for member booking owned by user-a.
assertEqual(
  "member booking wrong customer → 403",
  resolveBookingAccessOutcome(true, "user-a", "user-b"),
  "forbidden",
);
assertEqual(
  "member booking anonymous → 404",
  resolveBookingAccessOutcome(true, "user-a", null),
  "not_found",
);
assertEqual(
  "member booking owner → allow",
  resolveBookingAccessOutcome(true, "user-a", "user-a"),
  "allow",
);
assertEqual("missing booking → 404", resolveBookingAccessOutcome(false, null, "user-a"), "not_found");

// Staff admin API auth status codes.
assertEqual("staff API no session", resolveStaffAuthOutcome(false, false), 401);
assertEqual("staff API customer session", resolveStaffAuthOutcome(true, false), 403);
assertEqual("staff API active admin", resolveStaffAuthOutcome(true, true), 200);

console.log("PASS booking + staff authorization matrix");
