import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { extendBookingHold, getBookingById } from "@/server/queries/bookings.query";
import { createBookingPaymentIntent } from "@/server/payments/stripe";
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

  try {
    const paymentIntent = await createBookingPaymentIntent({
      bookingId: booking.id,
      amountThb: booking.totalAmount,
    });

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: booking.totalAmount,
      currency: "thb",
      status: "requires_payment_method",
    });
    if (insertError) {
      console.error("[api/bookings/:id/payment-intent] failed to insert payments row:", insertError);
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("[api/bookings/:id/payment-intent] POST failed:", error);
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 500 });
  }
}
