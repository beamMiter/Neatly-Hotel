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

export async function createBookingPaymentIntent(input: {
  bookingId: string;
  amountThb: number;
}): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.create({
    // THB has no Stripe zero-decimal exception — still multiply by 100.
    amount: Math.round(input.amountThb * 100),
    currency: "thb",
    metadata: { bookingId: input.bookingId },
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
