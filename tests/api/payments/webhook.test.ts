vi.mock("server-only", () => ({}));
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructWebhookEvent: vi.fn(),
  retrieveChargeWithCard: vi.fn(),
  updateBookingPaymentStatus: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/server/payments/stripe", () => ({
  constructWebhookEvent: mocks.constructWebhookEvent,
  retrieveChargeWithCard: mocks.retrieveChargeWithCard,
}));

vi.mock("@/server/queries/bookings.query", () => ({
  updateBookingPaymentStatus: mocks.updateBookingPaymentStatus,
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
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "payment-row" }, error: null }),
          })),
        })),
      })),
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
    created: 1790000000,
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
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", "credit_card", INTENT_ID, false, new Date(1790000000000));
    });

    it("resolves 'promptpay' from a PromptPay charge and forwards it", async () => {
      succeededEvent({ paymentMethodType: "promptpay" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", "promptpay", INTENT_ID, false, new Date(1790000000000));
    });

    it("reconciles top-ups through the same cancellation guard", async () => {
      succeededEvent({ paymentMethodType: "card", paymentKind: "top_up" });

      await POST(webhookRequest());

      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", "credit_card", INTENT_ID, true, new Date(1790000000000));
    });
  });

  describe("Error Case", () => {
    it("passes undefined when the intent has no charge to read a method from", async () => {
      succeededEvent({ hasCharge: false });

      await POST(webhookRequest());

      expect(mocks.retrieveChargeWithCard).not.toHaveBeenCalled();
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith(BOOKING_ID, "paid", undefined, INTENT_ID, false, new Date(1790000000000));
    });

    it("reconciles a superseded success so received money is not silently ignored", async () => {
      stubPaymentsTable("pi_newer_retry");
      succeededEvent({ paymentMethodType: "card" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).toHaveBeenCalled();
    });

    it("returns 400 when the stripe-signature header is missing", async () => {
      const response = await POST(
        new Request("http://localhost/api/payments/webhook", { method: "POST", body: "{}" }),
      );

      expect(response.status).toBe(400);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });

    it("returns 500 so Stripe retries when the payment row cannot be recorded", async () => {
      succeededEvent();
      mocks.from.mockImplementation(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "write failed" },
                }),
              })),
            })),
          })),
        })),
      }));

      const response = await POST(webhookRequest());

      expect(response.status).toBe(500);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });

    it("returns 500 when refund reconciliation fails, allowing Stripe to retry", async () => {
      succeededEvent();
      mocks.updateBookingPaymentStatus.mockRejectedValueOnce(new Error("refund unavailable"));
      expect((await POST(webhookRequest())).status).toBe(500);
    });

    it("ignores an event when its payment state can no longer transition", async () => {
      succeededEvent();
      mocks.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: "refunded" }, error: null }),
          })),
        })),
      });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });

    it("returns 500 when no payment row exists for the verified Stripe event", async () => {
      succeededEvent();
      mocks.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(500);
      expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled();
    });
  });
});
