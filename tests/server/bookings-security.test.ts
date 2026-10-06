import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  txQuery: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  retrieve: vi.fn(),
  cancel: vi.fn(),
  updateMany: vi.fn(),
  from: vi.fn(),
  refund: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    booking: { updateMany: mocks.updateMany },
  },
}));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/server/payments/stripe", () => ({
  refundPayment: mocks.refund,
  cancelPaymentIntent: mocks.cancel,
  createBookingPaymentIntent: vi.fn(),
  retrieveChargeWithCard: vi.fn(),
  retrievePaymentIntent: mocks.retrieve,
}));
vi.mock("@/server/queries/notifications.query", () => ({ createNotification: mocks.notify }));
vi.mock("@/server/services/booking-confirmation-email", () => ({
  maybeSendGuestBookingConfirmationEmail: vi.fn(),
}));

import { cancelBooking, lookupBookingByCodeAndEmail } from "@/server/queries/bookings.query";

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";
function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    booking_code: "NB-20260912-ABCD",
    customer_id: null,
    status: "confirmed",
    payment_status: "paid",
    payment_method: "credit_card",
    check_in: "2026-12-01",
    check_out: "2026-12-03",
    guests: 2,
    total_amount: 1200,
    room_type_id: BOOKING_ID,
    room_type_name: "Test room",
    rooms_count: 1,
    guest_first_name: "Test",
    guest_last_name: "Guest",
    guest_email: "guest@example.com",
    guest_phone: "0812345678",
    guest_date_of_birth: "1990-01-01",
    guest_country: "Thailand",
    standard_requests: [],
    special_requests: [],
    additional_request: null,
    promo_code: null,
    discount_amount: 0,
    created_at: new Date().toISOString(),
    cancelled_at: null,
    card_brand: "visa",
    card_last4: "4242",
    ...overrides,
  };
}

describe("guest booking lookup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("limits code-and-email credentials to guest bookings", async () => {
    mocks.queryRaw.mockResolvedValue([]);
    await expect(lookupBookingByCodeAndEmail("NB-20260912-ABCD", "guest@example.com"))
      .resolves.toBeNull();
    const [sql] = mocks.queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(sql.join("?")).toMatch(/b\.customer_id is null/i);
  });
});

describe("multi-payment refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockReset()
      .mockResolvedValueOnce([bookingRow()])
      .mockResolvedValueOnce([bookingRow({ status: "refunded" })]);
    mocks.transaction.mockImplementation(async (callback) => callback({
      $queryRaw: mocks.txQuery, $executeRaw: mocks.execute, booking: { updateMany: mocks.updateMany },
    }));
    mocks.txQuery.mockReset().mockResolvedValueOnce([{ status: "confirmed", cancelled_at: null }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_initial", status: "succeeded" },
        { stripe_payment_intent_id: "pi_top_up", status: "succeeded" }]);
    mocks.retrieve.mockImplementation(async (id) => ({ id, status: "succeeded" }));
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.refund.mockResolvedValue({});
  });

  it("refunds every succeeded payment with a stable per-intent key", async () => {
    const result = await cancelBooking(BOOKING_ID, null);
    expect(mocks.refund).toHaveBeenCalledTimes(2);
    expect(mocks.refund).toHaveBeenNthCalledWith(
      1,
      "pi_initial",
      `refund_${BOOKING_ID}_pi_initial`,
    );
    expect(mocks.refund).toHaveBeenNthCalledWith(
      2,
      "pi_top_up",
      `refund_${BOOKING_ID}_pi_top_up`,
    );
    expect(result.refunded).toBe(true);
    expect(mocks.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: BOOKING_ID },
      data: { status: "cancelled", cancelledAt: expect.any(Date), expiresAt: null },
    });
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: BOOKING_ID, status: "cancelled" },
      data: { status: "refunded" },
    });
  });

  it("does not release the booking when payment lookup fails", async () => {
    mocks.queryRaw.mockReset().mockResolvedValue([bookingRow()]);
    mocks.txQuery.mockReset().mockResolvedValueOnce([{ status: "confirmed", cancelled_at: null }])
      .mockRejectedValueOnce(new Error("payment read failed"));
    await expect(cancelBooking(BOOKING_ID, null)).rejects.toThrow("payment read failed");
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("refunds the original capture while canceling an unpaid top-up", async () => {
    mocks.queryRaw.mockReset().mockResolvedValue([bookingRow({ payment_status: "pending" })]);
    mocks.txQuery.mockReset().mockResolvedValueOnce([{ status: "confirmed", cancelled_at: null }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_initial", status: "succeeded" },
        { stripe_payment_intent_id: "pi_top_up", status: "requires_payment_method" }]);
    mocks.retrieve.mockImplementation(async (id) => ({ id, status: id === "pi_initial" ? "succeeded" : "requires_payment_method" }));
    await cancelBooking(BOOKING_ID, null);
    expect(mocks.refund).toHaveBeenCalledWith("pi_initial", `refund_${BOOKING_ID}_pi_initial`);
    expect(mocks.refund).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).toHaveBeenCalledWith("pi_top_up");
  });

  it("refunds a payment that succeeds while Stripe cancellation is in flight", async () => {
    mocks.retrieve.mockReset().mockResolvedValueOnce({ id: "pi_initial", status: "requires_payment_method" })
      .mockResolvedValueOnce({ id: "pi_initial", status: "succeeded" })
      .mockResolvedValueOnce({ id: "pi_top_up", status: "canceled" });
    mocks.cancel.mockRejectedValueOnce(new Error("already succeeded"));
    await cancelBooking(BOOKING_ID, null);
    expect(mocks.refund).toHaveBeenCalledWith("pi_initial", `refund_${BOOKING_ID}_pi_initial`);
  });

  it("propagates cancellation failure so the caller can retry cleanup", async () => {
    mocks.retrieve.mockReset().mockResolvedValue({ id: "pi_initial", status: "processing" });
    mocks.cancel.mockRejectedValueOnce(new Error("Stripe offline"));
    await expect(cancelBooking(BOOKING_ID, null)).rejects.toThrow("Stripe offline");
  });

  it("uses the original cancellation timestamp when a refund is retried after 72 hours", async () => {
    mocks.queryRaw.mockReset().mockResolvedValue([bookingRow({ created_at: "2026-01-01T00:00:00Z", status: "cancelled" })]);
    mocks.txQuery.mockReset().mockResolvedValueOnce([{ status: "cancelled", cancelled_at: new Date("2026-01-02T00:00:00Z") }])
      .mockResolvedValueOnce([{ stripe_payment_intent_id: "pi_initial", status: "succeeded" }]);
    await cancelBooking(BOOKING_ID, null);
    expect(mocks.refund).toHaveBeenCalledWith("pi_initial", `refund_${BOOKING_ID}_pi_initial`);
  });
});
