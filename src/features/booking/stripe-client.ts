"use client";

import { loadStripe } from "@stripe/stripe-js";

// Single shared Stripe.js instance for every card-entry surface in the
// booking flow (new booking + failed-payment retry) — loadStripe() should
// only run once per publishable key, and both surfaces need the same
// locale so labels stay in English instead of auto-detecting the browser's.
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "", { locale: "en" });
