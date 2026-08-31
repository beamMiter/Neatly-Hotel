/**
 * Offline checks for admin booking edit rules.
 * Source of truth: src/lib/admin-booking-edit.ts (keep matrices in sync).
 */

function isAdminBookingEditable(status) {
  return status === "pending_payment" || status === "confirmed" || status === "checked_in";
}

function isUnpaidPendingPaymentBooking(status) {
  return status === "pending_payment";
}

function validateAdminDateChange(params) {
  if (!isAdminBookingEditable(params.status)) {
    return { ok: false, reason: "status_not_editable" };
  }

  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !iso.test(params.newCheckIn) ||
    !iso.test(params.newCheckOut) ||
    !iso.test(params.currentCheckIn) ||
    !iso.test(params.currentCheckOut)
  ) {
    return { ok: false, reason: "invalid_dates" };
  }

  const nightsBetween = (checkIn, checkOut) => {
    const start = Date.parse(`${checkIn}T00:00:00+07:00`);
    const end = Date.parse(`${checkOut}T00:00:00+07:00`);
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  };

  const previousNights = nightsBetween(params.currentCheckIn, params.currentCheckOut);
  const nextNights = nightsBetween(params.newCheckIn, params.newCheckOut);

  if (nextNights < 1) return { ok: false, reason: "invalid_dates" };
  if (nextNights < previousNights) return { ok: false, reason: "nights_reduced" };

  if (params.status === "checked_in") {
    if (params.newCheckIn !== params.currentCheckIn) return { ok: false, reason: "check_in_locked" };
    if (params.newCheckOut <= params.currentCheckOut) return { ok: false, reason: "checkout_not_extended" };
  }

  return { ok: true, nightsAdded: nextNights - previousNights };
}

function validateRoomUpgrade(currentRoomSubtotal, nextRoomSubtotal) {
  if (nextRoomSubtotal <= currentRoomSubtotal) {
    return { ok: false, reason: "not_an_upgrade" };
  }
  return { ok: true, difference: nextRoomSubtotal - currentRoomSubtotal };
}

function calculateEditPriceDifference(previousTotal, nextTotal) {
  return Math.max(0, nextTotal - previousTotal);
}

function resolveEditPaymentRequirement(paymentMethod, difference) {
  if (difference <= 0) return { requiresPayment: false };
  if (paymentMethod === "credit_card") {
    return { requiresPayment: true, amount: difference, channel: "stripe", paymentStatus: "pending" };
  }
  return { requiresPayment: true, amount: difference, channel: "pay_at_hotel", paymentStatus: "pay_at_hotel" };
}

function resolveEditPaymentRequirementForBooking(status, paymentMethod, previousTotal, nextTotal) {
  const difference = calculateEditPriceDifference(previousTotal, nextTotal);
  if (difference <= 0) return { requiresPayment: false };

  if (isUnpaidPendingPaymentBooking(status)) {
    if (paymentMethod === "credit_card") {
      return { requiresPayment: true, amount: nextTotal, channel: "pay_at_hotel", paymentStatus: "pay_at_hotel" };
    }
    return { requiresPayment: true, amount: nextTotal, channel: "pay_at_hotel", paymentStatus: "pay_at_hotel" };
  }

  return resolveEditPaymentRequirement(paymentMethod, difference);
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS ${label}`);
}

function assertDeepEqual(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, got ${actualJson}`);
  }
  console.log(`PASS ${label}`);
}

assertEqual("pending_payment editable", isAdminBookingEditable("pending_payment"), true);
assertEqual("confirmed editable", isAdminBookingEditable("confirmed"), true);
assertEqual("checked_in editable", isAdminBookingEditable("checked_in"), true);
assertEqual("completed not editable", isAdminBookingEditable("completed"), false);

assertDeepEqual(
  "pending_payment extend nights",
  validateAdminDateChange({
    status: "pending_payment",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-01",
    newCheckOut: "2026-09-05",
  }),
  { ok: true, nightsAdded: 2 },
);

assertDeepEqual(
  "confirmed extend nights",
  validateAdminDateChange({
    status: "confirmed",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-01",
    newCheckOut: "2026-09-05",
  }),
  { ok: true, nightsAdded: 2 },
);

assertDeepEqual(
  "confirmed shift dates same nights",
  validateAdminDateChange({
    status: "confirmed",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-05",
    newCheckOut: "2026-09-07",
  }),
  { ok: true, nightsAdded: 0 },
);

assertDeepEqual(
  "confirmed reject shorter stay",
  validateAdminDateChange({
    status: "confirmed",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-05",
    newCheckIn: "2026-09-01",
    newCheckOut: "2026-09-03",
  }),
  { ok: false, reason: "nights_reduced" },
);

assertDeepEqual(
  "checked_in extend checkout only",
  validateAdminDateChange({
    status: "checked_in",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-01",
    newCheckOut: "2026-09-05",
  }),
  { ok: true, nightsAdded: 2 },
);

assertDeepEqual(
  "checked_in lock check-in",
  validateAdminDateChange({
    status: "checked_in",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-02",
    newCheckOut: "2026-09-05",
  }),
  { ok: false, reason: "check_in_locked" },
);

assertDeepEqual(
  "checked_in reject same checkout",
  validateAdminDateChange({
    status: "checked_in",
    currentCheckIn: "2026-09-01",
    currentCheckOut: "2026-09-03",
    newCheckIn: "2026-09-01",
    newCheckOut: "2026-09-03",
  }),
  { ok: false, reason: "checkout_not_extended" },
);

assertDeepEqual("upgrade accepts higher subtotal", validateRoomUpgrade(5000, 7000), { ok: true, difference: 2000 });
assertDeepEqual("upgrade rejects equal subtotal", validateRoomUpgrade(5000, 5000), { ok: false, reason: "not_an_upgrade" });
assertDeepEqual("upgrade rejects downgrade", validateRoomUpgrade(7000, 5000), { ok: false, reason: "not_an_upgrade" });

assertEqual("price difference positive delta", calculateEditPriceDifference(1000, 1500), 500);
assertEqual("price difference no refund", calculateEditPriceDifference(1500, 1000), 0);

assertDeepEqual("stripe payment for difference", resolveEditPaymentRequirement("credit_card", 500), {
  requiresPayment: true,
  amount: 500,
  channel: "stripe",
  paymentStatus: "pending",
});
assertDeepEqual("pay-at-hotel for difference", resolveEditPaymentRequirement("cash", 500), {
  requiresPayment: true,
  amount: 500,
  channel: "pay_at_hotel",
  paymentStatus: "pay_at_hotel",
});
assertDeepEqual("no payment when difference zero", resolveEditPaymentRequirement("credit_card", 0), {
  requiresPayment: false,
});

assertDeepEqual(
  "pending_payment always pay at hotel",
  resolveEditPaymentRequirementForBooking("pending_payment", "credit_card", 1000, 1500),
  { requiresPayment: true, amount: 1500, channel: "pay_at_hotel", paymentStatus: "pay_at_hotel" },
);
assertDeepEqual(
  "pending_payment pay at hotel unchanged",
  resolveEditPaymentRequirementForBooking("pending_payment", "cash", 1000, 1500),
  { requiresPayment: true, amount: 1500, channel: "pay_at_hotel", paymentStatus: "pay_at_hotel" },
);
assertDeepEqual(
  "confirmed still charges difference only",
  resolveEditPaymentRequirementForBooking("confirmed", "credit_card", 1000, 1500),
  { requiresPayment: true, amount: 500, channel: "stripe", paymentStatus: "pending" },
);

console.log("\nAll admin booking edit rule checks passed.");
