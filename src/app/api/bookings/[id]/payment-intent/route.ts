import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  extendBookingHold,
  getBookingById,
  updateBookingPaymentStatus,
} from "@/server/queries/bookings.query";
import {
  cancelPaymentIntent,
  createBookingPaymentIntent,
  retrievePaymentIntent,
} from "@/server/payments/stripe";
import { supabaseAdmin } from "@/server/db/supabase-admin";

type RouteParams = { params: Promise<{ id: string }> };

// Retry after a failed/abandoned card payment. Creates a NEW PaymentIntent
// and a NEW payments row rather than reusing the booking created earlier —
// re-POSTing to /api/bookings instead would create a second booking +
// booking_rooms, double-locking inventory for the same guest (see plan §8).
export async function POST(request: Request, { params }: RouteParams) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "You must be logged in" }, { status: 401 });
  }

  const { id } = await params;

  // Resolve the previous attempt BEFORE touching the hold, so a booking we
  // turn out not to be allowed to supersede is left exactly as it was.
  const { data: priorPayments, error: priorError } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id, status")
    .eq("booking_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  // Fatal: proceeding blind here would open a second live intent alongside
  // an unknown first one — exactly the double-charge this block prevents.
  if (priorError) {
    console.error("[api/bookings/:id/payment-intent] could not read prior payments:", priorError);
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
  }

  // Ask Stripe, not our own row. A decline leaves the intent at
  // `requires_payment_method` — still confirmable with another card — while
  // our row says "failed", and a success whose webhook hasn't landed yet
  // still reads as `requires_payment_method` locally. Only Stripe knows
  // which of those it is, and superseding the wrong one either strands a
  // real charge or lets the guest pay twice.
  const prior = priorPayments?.[0];
  let priorIntentToCancel: string | null = null;

  if (prior && prior.status !== "canceled" && prior.status !== "succeeded") {
    let priorStatus: string;
    try {
      priorStatus = (await retrievePaymentIntent(prior.stripe_payment_intent_id)).status;
    } catch (error) {
      console.error("[api/bookings/:id/payment-intent] could not read the prior intent:", error);
      return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
    }

    if (["succeeded", "processing", "requires_capture"].includes(priorStatus)) {
      return NextResponse.json(
        { message: "A payment for this booking is already going through. Please wait a moment." },
        { status: 409 },
      );
    }
    priorIntentToCancel = prior.stripe_payment_intent_id;
  }

  const extended = await extendBookingHold(id, user.id);
  if (!extended) {
    return NextResponse.json(
      { message: "This booking can no longer be retried — please start a new booking" },
      { status: 409 },
    );
  }

  const booking = await getBookingById(id, user.id);
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  async function releaseHold() {
    await updateBookingPaymentStatus(id, "failed").catch((error) => {
      console.error("[api/bookings/:id/payment-intent] failed to release hold:", error);
    });
  }

  let paymentIntent;
  try {
    paymentIntent = await createBookingPaymentIntent({
      bookingId: booking.id,
      amountThb: booking.totalAmount,
    });
  } catch (error) {
    // extendBookingHold already re-held the rooms for another 30 minutes —
    // give them back rather than leaving an unpayable hold behind.
    console.error("[api/bookings/:id/payment-intent] PaymentIntent creation failed:", error);
    await releaseHold();
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
  }

  const { error: insertError } = await supabaseAdmin.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntent.id,
    amount: booking.totalAmount,
    currency: "thb",
    status: "requires_payment_method",
  });

  // Fatal here: without this row the *previous* attempt stays the latest, so
  // the webhook would reject the retry's own success and never confirm.
  if (insertError) {
    console.error("[api/bookings/:id/payment-intent] failed to insert payments row:", insertError);
    await cancelPaymentIntent(paymentIntent.id).catch((error) => {
      console.error("[api/bookings/:id/payment-intent] failed to cancel orphaned intent:", error);
    });
    await releaseHold();
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
  }

  // Cancel only now that the new row is the booking's latest. Cancelling
  // earlier left a window where the prior row was still latest, so Stripe's
  // `payment_intent.canceled` for it would pass the webhook's gate and
  // cancel the booking we had just revived — handing back a clientSecret for
  // a booking whose rooms were already released.
  if (priorIntentToCancel) {
    await cancelPaymentIntent(priorIntentToCancel).catch((error) => {
      console.error("[api/bookings/:id/payment-intent] could not cancel the superseded intent:", error);
    });
  }

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
