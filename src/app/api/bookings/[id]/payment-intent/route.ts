import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  extendBookingHold,
  getBookingById,
  updateBookingPaymentStatus,
} from "@/server/queries/bookings.query";
import { cancelPaymentIntent, createBookingPaymentIntent } from "@/server/payments/stripe";
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

  // Cancel the intent being superseded before opening a new one. Without
  // this both stay confirmable — a guest whose first attempt is merely
  // unfinished (3DS pending, still processing) rather than declined could be
  // charged twice, and the webhook's latest-row gate would then discard the
  // first success.
  const { data: priorPayments } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id, status")
    .eq("booking_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const prior = priorPayments?.[0];
  if (prior && !["succeeded", "canceled", "failed"].includes(prior.status)) {
    await cancelPaymentIntent(prior.stripe_payment_intent_id).catch((error) => {
      console.error("[api/bookings/:id/payment-intent] could not cancel the prior intent:", error);
    });
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

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
