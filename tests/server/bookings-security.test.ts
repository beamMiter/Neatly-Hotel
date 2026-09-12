import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  updateMany: vi.fn(),
  from: vi.fn(),
  refund: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    booking: { updateMany: mocks.updateMany },
  },
}));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/server/payments/stripe", () => ({
  refundPayment: mocks.refund,
  cancelPaymentIntent: vi.fn(),
  createBookingPaymentIntent: vi.fn(),
  retrieveChargeWithCard: vi.fn(),
  retrievePaymentIntent: vi.fn(),
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
    mocks.queryRaw
      .mockResolvedValueOnce([bookingRow()])
      .mockResolvedValueOnce([bookingRow({ status: "refunded" })]);
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockResolvedValue({
      data: [
        { stripe_payment_intent_id: "pi_initial" },
        { stripe_payment_intent_id: "pi_top_up" },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(chain);
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
      where: { id: BOOKING_ID, status: { in: ["pending_payment", "confirmed"] } },
      data: { status: "cancelled", cancelledAt: expect.any(Date) },
    });
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: BOOKING_ID, status: "cancelled" },
      data: { status: "refunded" },
    });
  });

  it("does not release the booking when payment lookup fails", async () => {
    mocks.queryRaw.mockReset().mockResolvedValue([bookingRow()]);
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: null, error: { message: "read failed" } });
    mocks.from.mockReturnValue(chain);

    await expect(cancelBooking(BOOKING_ID, null)).rejects.toThrow(
      "Unable to verify payments before refunding",
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
  });
});
