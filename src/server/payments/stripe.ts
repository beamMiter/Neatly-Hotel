import "server-only";
import Stripe from "stripe";

// Lazily constructed — not at module load. Next.js's build-time page-data
// collection imports every route module just to read its exports, without
// a real request; a module-level `throw` here would fail the whole build
// the moment STRIPE_SECRET_KEY is unset, even for routes that never
// actually call Stripe at build time. Deferring the check to first real
// use keeps that failure where it belongs — an actual request.
let cachedStripe: Stripe | null = null;

function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  cachedStripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
  return cachedStripe;
}

// Stripe is the only honest source for an intent's state: our payments row
// says "failed" for a decline that is actually still confirmable, and still
// says "requires_payment_method" for a success whose webhook hasn't landed.
export async function retrievePaymentIntent(intentId: string): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.retrieve(intentId);
}

// Best-effort teardown for an intent we created but can no longer honour
// (e.g. its payments row failed to insert, or it is being superseded by a
// retry). Cancelling at Stripe is what stops the guest from paying against
// an intent nothing will reconcile. Already-terminal intents throw here —
// callers check retrievePaymentIntent first when that matters.
export async function cancelPaymentIntent(intentId: string): Promise<void> {
  await getStripe().paymentIntents.cancel(intentId);
}

export async function createBookingPaymentIntent(input: {
  bookingId: string;
  amountThb: number;
  paymentKind?: "top_up";
}): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.create({
    // THB has no Stripe zero-decimal exception — still multiply by 100.
    amount: Math.round(input.amountThb * 100),
    currency: "thb",
    metadata: {
      bookingId: input.bookingId,
      ...(input.paymentKind ? { paymentKind: input.paymentKind } : {}),
    },
    automatic_payment_methods: { enabled: true },
  });
}

export function constructWebhookEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function retrieveChargeWithCard(chargeId: string): Promise<Stripe.Charge> {
  return getStripe().charges.retrieve(chargeId, { expand: ["payment_method_details"] });
}

// Full refund of a succeeded payment intent — used by booking cancellation
// when the guest cancels within the refund-eligible window (see
// isRefundEligible in src/features/booking/date-rules.ts).
//
// idempotencyKey should be stable per booking (e.g. `refund_${bookingId}`):
// if this exact call is retried at the network layer after Stripe already
// processed it, Stripe returns the original refund instead of creating a
// second one. The caller is still responsible for not calling this twice
// for two genuinely different attempts — see the atomic status claim in
// cancelBooking (bookings.query.ts).
export async function refundPayment(
  paymentIntentId: string,
  idempotencyKey?: string,
): Promise<Stripe.Refund> {
  return getStripe().refunds.create(
    { payment_intent: paymentIntentId },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}
