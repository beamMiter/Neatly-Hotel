import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/types/booking";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  query: vi.fn(), execute: vi.fn(), update: vi.fn(), transaction: vi.fn(),
  from: vi.fn(), refund: vi.fn(), retrieve: vi.fn(), cancel: vi.fn(), create: vi.fn(), email: vi.fn(),
}));
vi.mock("@/server/db", () => ({ prisma: {
  $queryRaw: mocks.query, $executeRaw: mocks.execute, $transaction: mocks.transaction,
  booking: { updateMany: mocks.update },
} }));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/server/payments/stripe", () => ({
  retrievePaymentIntent: mocks.retrieve, createBookingPaymentIntent: mocks.create,
  cancelPaymentIntent: mocks.cancel, refundPayment: mocks.refund, retrieveChargeWithCard: vi.fn(),
}));
vi.mock("@/server/services/booking-confirmation-email", () => ({ maybeSendGuestBookingConfirmationEmail: mocks.email }));
vi.mock("@/server/queries/notifications.query", () => ({ createNotification: vi.fn() }));

import {
  createInitialPaymentAttempt, createTopUpPaymentAttempt, extendBookingHold,
  getBookingPaymentBalance, isTopUpPaymentEligible, updateBookingPaymentStatus,
} from "@/server/queries/bookings.query";

const ID = "11111111-1111-1111-1111-111111111111";
const INTENT = "pi_paid";
const booking = {
  status: "pending_payment", payment_status: "pending", payment_method: "credit_card",
  cancelled_at: null, created_at: new Date(), check_in: "2026-12-01", check_out: "2026-12-03",
  total_amount: 1500,
};
function paymentQueries(overrides = {}, conflicts = 0) {
  mocks.query.mockResolvedValueOnce([{ ...booking, ...overrides }])
    .mockResolvedValueOnce([{ stripe_payment_intent_id: INTENT, status: "succeeded" }])
    .mockResolvedValueOnce([{ room_id: ID, status: "Clean" }])
    .mockResolvedValueOnce([{ count: BigInt(conflicts) }]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (callback) => callback({
    $queryRaw: mocks.query, $executeRaw: mocks.execute, booking: { updateMany: mocks.update },
  }));
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.refund.mockResolvedValue({ status: "succeeded" });
  mocks.cancel.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue({ id: "pi_new", client_secret: "new_secret" });
});

describe("settlement inventory and lifecycle", () => {
  it("refunds late payment when the expired hold's room has been resold", async () => {
    paymentQueries({}, 1);
    expect(await updateBookingPaymentStatus(ID, "paid", "credit_card", INTENT)).toBe(false);
    expect(mocks.refund).toHaveBeenCalledWith(INTENT, `refund_${ID}_${INTENT}`);
    expect(mocks.update.mock.calls.some(([input]) => input.data.status === "confirmed")).toBe(false);
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls[0][0].join("?")).toContain("for update");
    expect(mocks.query.mock.calls[2][0].join("?")).toContain("for update of r");
    expect(mocks.query.mock.calls[3][0].join("?")).toContain("b.expires_at > now()");
  });

  it("can confirm an expired hold only after locking and rechecking free rooms", async () => {
    paymentQueries();
    expect(await updateBookingPaymentStatus(ID, "paid", "promptpay", INTENT)).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "confirmed", paymentMethod: "promptpay" }) }));
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it("reconciles success of the same declined intent instead of leaving booking failed", async () => {
    paymentQueries({ status: "cancelled", payment_status: "failed" });
    expect(await updateBookingPaymentStatus(ID, "paid", "credit_card", INTENT)).toBe(true);
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("refunds a successful retry if the released room is no longer free", async () => {
    paymentQueries({ status: "cancelled", payment_status: "failed" }, 1);
    expect(await updateBookingPaymentStatus(ID, "paid", undefined, INTENT)).toBe(false);
    expect(mocks.refund).toHaveBeenCalledOnce();
  });

  it.each([false, true])("never revives explicit cancellation (top-up: %s)", async (topUp) => {
    paymentQueries({ status: "cancelled", cancelled_at: new Date() });
    expect(await updateBookingPaymentStatus(ID, "paid", undefined, INTENT, topUp)).toBe(false);
    expect(mocks.refund).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("does not refund an old captured charge outside the cancellation policy on redelivery", async () => {
    const created = new Date("2026-01-01"), cancelled = new Date("2026-01-10");
    paymentQueries({ status: "cancelled", created_at: created, cancelled_at: cancelled });
    await updateBookingPaymentStatus(ID, "paid", undefined, INTENT, false, created);
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("propagates refund failure so Stripe will redeliver the event", async () => {
    paymentQueries({}, 1);
    mocks.refund.mockRejectedValue(new Error("Stripe unavailable"));
    await expect(updateBookingPaymentStatus(ID, "paid", undefined, INTENT)).rejects.toThrow("Stripe unavailable");
    expect(mocks.update.mock.calls.some(([input]) => input.data.status === "refunded")).toBe(false);
  });

  it("retries a required refund after 72h without attempting to confirm newly free inventory", async () => {
    mocks.query.mockResolvedValueOnce([{ ...booking, status: "cancelled", cancelled_at: new Date(), created_at: new Date("2020-01-01") }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: INTENT, status: "succeeded",
        settlement_failure: "Booking could not accept this payment; refund required" }]);
    await updateBookingPaymentStatus(ID, "paid", undefined, INTENT, false, new Date("2020-01-05"));
    expect(mocks.refund).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("ignores a delayed failure after the attempt succeeded", async () => {
    paymentQueries();
    await updateBookingPaymentStatus(ID, "failed", undefined, INTENT);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("ignores a superseded failure even if its earlier outside-transaction check passed", async () => {
    mocks.query.mockResolvedValueOnce([booking]).mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_new", status: "requires_payment_method" }]);
    await updateBookingPaymentStatus(ID, "failed", undefined, INTENT);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("payment creation fails closed", () => {
  it.each(["cancelled", "refunded", "completed", "pending_payment"])("does not allow top-ups for %s", async (status) => {
    expect(isTopUpPaymentEligible({ status, paymentStatus: "pending" } as BookingRecord, { amountDue: 500 })).toBe(false);
    mocks.query.mockResolvedValueOnce([{ ...booking, status }]);
    await expect(createTopUpPaymentAttempt(ID, 500)).rejects.toThrow("can no longer accept");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rechecks cancellation under the booking lock before creating an initial intent", async () => {
    mocks.query.mockResolvedValueOnce([{ ...booking, status: "cancelled", cancelled_at: new Date() }]);
    await expect(createInitialPaymentAttempt(ID, 1500)).rejects.toThrow("can no longer accept");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not start a charge when payment history cannot be read", async () => {
    mocks.query.mockResolvedValueOnce([{ ...booking, status: "confirmed" }]).mockRejectedValueOnce(new Error("ledger offline"));
    await expect(createTopUpPaymentAttempt(ID, 500)).rejects.toThrow("ledger offline");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not treat a failed balance lookup as zero paid", async () => {
    mocks.query.mockResolvedValue([{ total_amount: 1500 }]);
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: null, error: { message: "offline" } });
    mocks.from.mockReturnValue(chain);
    await expect(getBookingPaymentBalance(ID)).rejects.toThrow("Unable to verify");
  });

  it("refuses a stale amount after an earlier payment reduced the balance", async () => {
    mocks.query.mockResolvedValueOnce([{ ...booking, status: "confirmed" }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_old", status: "succeeded", amount: 1000 }]);
    await expect(createTopUpPaymentAttempt(ID, 1500)).rejects.toThrow("balance changed");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("collects only the remaining amount and cancels declined intents before exposing a new secret", async () => {
    mocks.query.mockResolvedValueOnce([{ ...booking, status: "confirmed" }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_old", status: "succeeded", amount: 1000 },
        { stripe_payment_intent_id: "pi_declined", status: "failed", amount: 500 }]);
    mocks.retrieve.mockResolvedValue({ id: "pi_declined", status: "requires_payment_method" });
    expect(await createTopUpPaymentAttempt(ID, 500)).toEqual({ clientSecret: "new_secret" });
    expect(mocks.cancel).toHaveBeenCalledWith("pi_declined");
    expect(mocks.cancel.mock.invocationCallOrder[0]).toBeLessThan(mocks.create.mock.invocationCallOrder[0]);
    expect(mocks.create).toHaveBeenCalledWith({ bookingId: ID, amountThb: 500, paymentKind: "top_up" });
  });

  it("does not create a replacement if canceling the old intent fails", async () => {
    mocks.query.mockResolvedValueOnce([booking]).mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_old", status: "failed", amount: 1500 }]);
    mocks.retrieve.mockResolvedValue({ id: "pi_old", status: "requires_payment_method" });
    mocks.cancel.mockRejectedValue(new Error("cannot cancel"));
    await expect(createInitialPaymentAttempt(ID, 1500)).rejects.toThrow("cannot cancel");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("cancels an orphaned new intent when its ledger insert fails", async () => {
    mocks.query.mockResolvedValueOnce([booking]).mockResolvedValueOnce([]);
    mocks.execute.mockRejectedValue(new Error("insert failed"));
    await expect(createInitialPaymentAttempt(ID, 1500)).rejects.toThrow("insert failed");
    expect(mocks.cancel).toHaveBeenCalledWith("pi_new");
  });

  it("does not extend a deliberately cancelled booking", async () => {
    mocks.query.mockResolvedValueOnce([{ customer_id: null }]).mockResolvedValueOnce([]);
    expect(await extendBookingHold(ID, null)).toBe(false);
    expect(mocks.query.mock.calls[1][0].join("?")).toContain("cancelled_at is null");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
