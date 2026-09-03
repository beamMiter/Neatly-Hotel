import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    $executeRaw: mocks.executeRaw,
  },
}));

vi.mock("@/server/db/supabase-admin", () => ({
  supabaseAdmin: {},
}));

import { markBookingCashConfirmed, updateBookingPaymentStatus } from "@/server/queries/bookings.query";

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";

// Prisma's tagged-template $executeRaw is invoked as fn(strings, ...values) —
// `sqlText()` collapses the literal chunks back to one string so tests can
// assert on hardcoded SQL fragments, and `values()` reads the interpolated
// placeholders in source order.
function sqlText() {
  const [strings] = mocks.executeRaw.mock.calls[0] as [TemplateStringsArray];
  return strings.join("?");
}

function values() {
  const [, ...rest] = mocks.executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return rest;
}

describe("markBookingCashConfirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(undefined);
  });

  describe("Happy Path", () => {
    it("sets payment_method to cash alongside status and payment_status", async () => {
      await markBookingCashConfirmed(BOOKING_ID);

      expect(mocks.executeRaw).toHaveBeenCalledOnce();
      expect(sqlText()).toContain("payment_method = 'cash'");
      expect(sqlText()).toContain("payment_status = 'pay_at_hotel'");
      expect(sqlText()).toContain("status = 'confirmed'");
      expect(sqlText()).toContain("expires_at = null");
      expect(values()).toEqual([BOOKING_ID]);
    });
  });
});

describe("updateBookingPaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(undefined);
  });

  describe("Happy Path", () => {
    it("records the confirmed method when a card payment settles", async () => {
      await updateBookingPaymentStatus(BOOKING_ID, "paid", "credit_card");

      expect(sqlText()).toContain("coalesce(?, payment_method)");
      expect(values()).toEqual(["credit_card", "paid", "confirmed", BOOKING_ID]);
    });

    it("records the confirmed method when a PromptPay payment settles", async () => {
      await updateBookingPaymentStatus(BOOKING_ID, "paid", "promptpay");

      expect(values()).toEqual(["promptpay", "paid", "confirmed", BOOKING_ID]);
    });
  });

  describe("Error Case", () => {
    it("marks the booking cancelled on a failed payment without touching payment_method", async () => {
      await updateBookingPaymentStatus(BOOKING_ID, "failed");

      // `coalesce(null, payment_method)` keeps whatever method was already
      // stored — a failed/canceled intent never tells us a new one.
      expect(values()).toEqual([null, "failed", "cancelled", BOOKING_ID]);
    });

    it("leaves payment_method untouched when no confirmed method is known", async () => {
      await updateBookingPaymentStatus(BOOKING_ID, "paid");

      expect(values()).toEqual([null, "paid", "confirmed", BOOKING_ID]);
    });
  });
});
