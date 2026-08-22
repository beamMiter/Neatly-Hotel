import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent, retrieveChargeWithCard } from "@/server/payments/stripe";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { updateBookingPaymentStatus } from "@/server/queries/bookings.query";

// A retry deliberately opens a NEW PaymentIntent for the same booking, so a
// delayed or redelivered event from a superseded intent can arrive after the
// booking is already settled. Only the booking's most recent payments row may
// move the booking's own status — otherwise a late payment_failed from the
// first attempt would un-confirm a booking the retry already paid for.
// Deliberately fails OPEN. This gate exists to ignore a *superseded* intent,
// which we can only know about from a newer payments row. If we can't read
// the table, or there is no row at all, we have no evidence this intent was
// superseded — and refusing would drop a real settled charge, leaving the
// guest paid-but-unconfirmed. Only a row that positively names a different
// intent as the latest is grounds for ignoring this event.
async function isCurrentIntentForBooking(bookingId: string, intentId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[api/payments/webhook] could not resolve the current intent, proceeding:", error);
    return true;
  }

  const latest = data?.[0]?.stripe_payment_intent_id;
  if (!latest) return true;
  return latest === intentId;
}

// Signature verification below IS the auth for this route — Stripe calls
// it directly, there is no session/user to check.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    console.error("[api/payments/webhook] signature verification failed:", error);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata.bookingId;

        // The webhook payload's `latest_charge` is just an id (unexpanded)
        // — re-fetch with the card details expanded rather than casting it.
        let card: Stripe.Charge.PaymentMethodDetails.Card | undefined;
        if (intent.latest_charge) {
          const chargeId =
            typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge.id;
          const charge = await retrieveChargeWithCard(chargeId);
          card = charge.payment_method_details?.card ?? undefined;
        }

        await supabaseAdmin
          .from("payments")
          .update({
            status: "succeeded",
            card_brand: card?.brand ?? null,
            card_last4: card?.last4 ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", intent.id);

        if (bookingId && (await isCurrentIntentForBooking(bookingId, intent.id))) {
          await updateBookingPaymentStatus(bookingId, "paid");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata.bookingId;

        await supabaseAdmin
          .from("payments")
          .update({
            status: "failed",
            failure_message: intent.last_payment_error?.message ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", intent.id);

        if (bookingId && (await isCurrentIntentForBooking(bookingId, intent.id))) {
          await updateBookingPaymentStatus(bookingId, "failed");
        }
        break;
      }

      case "payment_intent.canceled": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata.bookingId;

        await supabaseAdmin
          .from("payments")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", intent.id);

        // bookings.payment_status has no "canceled" value — a canceled
        // intent means the guest never completed payment, same outcome as
        // "failed" from the booking's point of view (room gets released).
        if (bookingId && (await isCurrentIntentForBooking(bookingId, intent.id))) {
          await updateBookingPaymentStatus(bookingId, "failed");
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[api/payments/webhook] handler failed:", error);
    // Non-2xx makes Stripe retry the event later — correct here, since the
    // signature already verified this is a real Stripe event we failed to
    // process, not something to silently swallow.
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
