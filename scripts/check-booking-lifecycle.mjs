// Offline scenario test for the customer booking → cancel → refund lifecycle.
// Pure logic only, no DB/Stripe — mirrors the real decision rules in
// src/server/queries/bookings.query.ts (cancelBooking/changeBookingDates)
// so the whole flow can be exercised without touching the shared dev DB.
// Source of truth: CANCELLABLE_STATUSES/CHANGEABLE_STATUSES in
// bookings.query.ts — keep these two arrays in sync if that file changes.
// Real (imported, not re-implemented) rules: isRefundEligible, isChangeDateEligible.

import assert from "node:assert/strict";
import { isChangeDateEligible, isRefundEligible, nightsBetween } from "../src/features/booking/date-rules.ts";

const CANCELLABLE_STATUSES = ["pending_payment", "confirmed"];
const CHANGEABLE_STATUSES = ["pending_payment", "confirmed"];

// Mirrors cancelBooking()'s decision — same order of checks, same statuses.
function resolveCancelOutcome(status, createdAt, now) {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    return { ok: false, reason: "not_cancellable" };
  }
  const refunded = isRefundEligible(createdAt, now);
  return { ok: true, finalStatus: refunded ? "refunded" : "cancelled", refunded };
}

// Mirrors changeBookingDates()'s decision — same order of checks.
function resolveChangeDateOutcome({ status, createdAt, checkIn, checkOut, nextCheckIn, nextCheckOut, now }) {
  if (!CHANGEABLE_STATUSES.includes(status)) {
    return { ok: false, reason: "not_changeable" };
  }
  if (!isChangeDateEligible(createdAt, now)) {
    return { ok: false, reason: "outside_change_window" };
  }
  const originalNights = nightsBetween(checkIn, checkOut);
  const requestedNights = nightsBetween(nextCheckIn, nextCheckOut);
  if (requestedNights !== originalNights) {
    return { ok: false, reason: "night_count_mismatch" };
  }
  return { ok: true };
}

const NOW = new Date("2026-09-10T12:00:00+07:00");
const bookedNow = NOW.toISOString();
const bookedOverThreeDaysAgo = new Date(NOW.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

// ── Scenario: booking → cancel → refund (within refund window) ──────────
{
  const outcome = resolveCancelOutcome("confirmed", bookedNow, NOW);
  assert.deepEqual(outcome, { ok: true, finalStatus: "refunded", refunded: true });
}

// ── Scenario: booking → cancel (outside refund window, no refund) ───────
{
  const outcome = resolveCancelOutcome("confirmed", bookedOverThreeDaysAgo, NOW);
  assert.deepEqual(outcome, { ok: true, finalStatus: "cancelled", refunded: false });
}

// ── Edge: pending_payment booking is cancellable too ─────────────────────
{
  const outcome = resolveCancelOutcome("pending_payment", bookedNow, NOW);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.finalStatus, "refunded");
}

// ── Edge: cancel an already-cancelled booking → reject ───────────────────
{
  const outcome = resolveCancelOutcome("cancelled", bookedNow, NOW);
  assert.deepEqual(outcome, { ok: false, reason: "not_cancellable" });
}

// ── Edge: cancel an already-refunded booking → reject (no double refund) ─
{
  const outcome = resolveCancelOutcome("refunded", bookedNow, NOW);
  assert.deepEqual(outcome, { ok: false, reason: "not_cancellable" });
}

// ── Edge: cancel a checked-in booking → reject ────────────────────────────
{
  const outcome = resolveCancelOutcome("checked_in", bookedNow, NOW);
  assert.deepEqual(outcome, { ok: false, reason: "not_cancellable" });
}

// ── Edge: cancel a completed booking → reject ─────────────────────────────
{
  const outcome = resolveCancelOutcome("completed", bookedNow, NOW);
  assert.deepEqual(outcome, { ok: false, reason: "not_cancellable" });
}

// ── Boundary: exactly 72h since booking is still refundable ──────────────
{
  const exactlyThreeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const outcome = resolveCancelOutcome("confirmed", exactlyThreeDaysAgo, NOW);
  assert.equal(outcome.finalStatus, "refunded");
}

// ── Boundary: 72h + 1s since booking is no longer refundable ─────────────
{
  const justOverThreeDaysAgo = new Date(NOW.getTime() - (3 * 24 * 60 * 60 * 1000 + 1000)).toISOString();
  const outcome = resolveCancelOutcome("confirmed", justOverThreeDaysAgo, NOW);
  assert.equal(outcome.finalStatus, "cancelled");
}

// ── Scenario: change date within 24h, same night count → allowed ─────────
{
  const outcome = resolveChangeDateOutcome({
    status: "confirmed",
    createdAt: bookedNow,
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nextCheckIn: "2026-10-05",
    nextCheckOut: "2026-10-07",
    now: NOW,
  });
  assert.deepEqual(outcome, { ok: true });
}

// ── Edge: change date with a different night count → reject ──────────────
{
  const outcome = resolveChangeDateOutcome({
    status: "confirmed",
    createdAt: bookedNow,
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nextCheckIn: "2026-10-05",
    nextCheckOut: "2026-10-09",
    now: NOW,
  });
  assert.deepEqual(outcome, { ok: false, reason: "night_count_mismatch" });
}

// ── Edge: change date outside the 24h window → reject ─────────────────────
{
  const outcome = resolveChangeDateOutcome({
    status: "confirmed",
    createdAt: bookedOverThreeDaysAgo,
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nextCheckIn: "2026-10-05",
    nextCheckOut: "2026-10-07",
    now: NOW,
  });
  assert.deepEqual(outcome, { ok: false, reason: "outside_change_window" });
}

// ── Edge: change date on a cancelled booking → reject ─────────────────────
{
  const outcome = resolveChangeDateOutcome({
    status: "cancelled",
    createdAt: bookedNow,
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nextCheckIn: "2026-10-05",
    nextCheckOut: "2026-10-07",
    now: NOW,
  });
  assert.deepEqual(outcome, { ok: false, reason: "not_changeable" });
}

// ── Boundary: exactly 24h since booking is still change-eligible ─────────
{
  const exactlyOneDayAgo = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const outcome = resolveChangeDateOutcome({
    status: "confirmed",
    createdAt: exactlyOneDayAgo,
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nextCheckIn: "2026-10-05",
    nextCheckOut: "2026-10-07",
    now: NOW,
  });
  assert.equal(outcome.ok, true);
}

console.log("PASS booking lifecycle scenario checks (booking -> cancel -> refund, change-date)");
