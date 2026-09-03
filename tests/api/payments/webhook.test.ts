import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructWebhookEvent: vi.fn(),
  retrieveChargeWithCard: vi.fn(),
  updateBookingPaymentStatus: vi.fn(),
  applyTopUpPaymentOutcome: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/server/payments/stripe", () => ({
  constructWebhookEvent: mocks.constructWebhookEvent,
  retrieveChargeWithCard: mocks.retrieveChargeWithCard,
}));

vi.mock("@/server/queries/bookings.query", () => ({
  updateBookingPaymentStatus: mocks.updateBookingPaymentStatus,
  applyTopUpPaymentOutcome: mocks.applyTopUpPaymentOutcome,
}));

vi.mock("@/server/db/supabase-admin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import { POST } from "@/app/api/payments/webhook/route";

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";
const INTENT_ID = "pi_current";
const CHARGE_ID = "ch_1";

function webhookRequest() {
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body: "{}",
  });
}

// Wires up the `payments` table chain used by the route: the
// success-branch's `.update().eq()` write, and the internal
// isCurrentIntentForBooking() `.select().eq().order().limit()` read.
// `latestIntentId: null` means no payments row supersedes this intent.
function stubPaymentsTable(latestIntentId: string | null) {
  mocks.from.mockImplementation(() => ({
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: latestIntentId ? [{ stripe_payment_intent_id: latestIntentId }] : [],
            error: null,
          }),
        })),
      })),
    })),
  }));
}

function succeededEvent(overrides: {
  paymentMethodType?: "card" | "promptpay";
  paymentKind?: "top_up";
  hasCharge?: boolean;
} = {}) {
  const { paymentMethodType = "card", paymentKind, hasCharge = true } = overrides;
  mocks.constructWebhookEvent.mockReturnValue({
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: INTENT_ID,
        latest_charge: hasCharge ? CHARGE_ID : null,
        metadata: { bookingId: BOOKING_ID, ...(paymentKind ? { paymentKind } : {}) },
      },
    },
  });
  mocks.retrieveChargeWithCard.mockResolvedValue({
    payment_method_details: {
      type: paymentMethodType,
      card: paymentMethodType === "card" ? { brand: "visa", last4: "4242" } : undefined,
    },
  });
}

describe("POST /api/payments/webhook — payment_intent.succeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPaymentsTable(INTENT_ID); // this intent is the current one for the booking
  });

  describe("Happy Path", () => {
    it("resolves 'credit_card' from a card charge and forwards it", async () => {
      succeededEvent({ paymentMethodType: "card" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", "credit_card");
    });

    it("resolves 'promptpay' from a PromptPay charge and forwards it", async () => {
      succeededEvent({ paymentMethodType: "promptpay" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", "promptpay");
    });

    it("does not resolve a confirmed method for a top-up payment", async () => {
      // Top-ups go through applyTopUpPaymentOutcome, which doesn't take (or
      // need) a payment method — the original booking's method is unrelated
      // to how the outstanding balance got settled.
      succeededEvent({ paymentMethodType: "card", paymentKind: "top_up" });

      await POST(webhookRequest());

      expect(mocks.applyTopUpPaymentOutcome).toHaveBeenCalledWith(BOOKING_ID, "paid");
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });
  });

  describe("Error Case", () => {
    it("passes undefined when the intent has no charge to read a method from", async () => {
      succeededEvent({ hasCharge: false });

      await POST(webhookRequest());

      expect(mocks.retrieveChargeWithCard).not.toHaveBeenCalled();
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", undefined);
    });

    it("skips updating the booking when a newer payment attempt has superseded this intent", async () => {
      stubPaymentsTable("pi_newer_retry");
      succeededEvent({ paymentMethodType: "card" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });

    it("returns 400 when the stripe-signature header is missing", async () => {
      const response = await POST(
        new Request("http://localhost/api/payments/webhook", { method: "POST", body: "{}" }),
      );

      expect(response.status).toBe(400);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });
  });
});
