import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  AmountTooLowError,
  createTopUpPaymentAttempt,
  extendBookingHold,
  getBookingById,
  getBookingPaymentBalance,
  isTopUpPaymentEligible,
  PaymentIntentBlockedError,
  resolvePriorIntentToCancel,
  updateBookingPaymentStatus,
} from "@/server/queries/bookings.query";
import {
  cancelPaymentIntent,
  createBookingPaymentIntent,
} from "@/server/payments/stripe";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { bookingAccessErrorResponse } from "@/server/services/booking-access";
import { assertEmailVerificationToken } from "@/server/queries/email-otp.query";
import { BOOKING_EMAIL_VERIFICATION_HEADER } from "@/lib/booking-email-verification";

type RouteParams = { params: Promise<{ id: string }> };

// Retry after a failed/abandoned card payment. Creates a NEW PaymentIntent
// and a NEW payments row rather than reusing the booking created earlier —
// re-POSTing to /api/bookings instead would create a second booking +
// booking_rooms, double-locking inventory for the same guest (see plan §8).
//
// Also handles top-up charges after admin edits on confirmed/checked-in bookings.
export async function POST(request: Request, { params }: RouteParams) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { id } = await params;
  const viewerId = user?.id ?? null;

  let booking;
  try {
    booking = await getBookingById(id, viewerId);
  } catch (error) {
    const forbidden = bookingAccessErrorResponse(error);
    if (forbidden) return forbidden;
    throw error;
  }
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }
  if (!user && !assertEmailVerificationToken(
    booking.guestInfo.email,
    request.headers.get(BOOKING_EMAIL_VERIFICATION_HEADER) ?? "",
  )) {
    return NextResponse.json({ message: "Please verify your email before payment" }, { status: 403 });
  }

  const balance = await getBookingPaymentBalance(id);
  const isTopUp = isTopUpPaymentEligible(booking, balance);

  if (isTopUp) {
    try {
      const { clientSecret } = await createTopUpPaymentAttempt(id, balance.amountDue);
      return NextResponse.json({ clientSecret, amountDue: balance.amountDue });
    } catch (error) {
      if (error instanceof PaymentIntentBlockedError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      if (error instanceof AmountTooLowError) {
        return NextResponse.json(
          { message: "The amount due is below the minimum card charge" },
          { status: 422 },
        );
      }
      console.error("[api/bookings/:id/payment-intent] top-up failed:", error);
      return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
    }
  }

  const priorResolution = await resolvePriorIntentToCancel(id);
  if ("readError" in priorResolution) {
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
  }
  if ("blocked" in priorResolution) {
    return NextResponse.json({ message: priorResolution.blocked }, { status: 409 });
  }
  const priorIntentToCancel = priorResolution.priorIntentToCancel;

  let extended: boolean;
  try {
    extended = await extendBookingHold(id, viewerId);
  } catch (error) {
    const forbidden = bookingAccessErrorResponse(error);
    if (forbidden) return forbidden;
    throw error;
  }
  if (!extended) {
    return NextResponse.json(
      { message: "This booking can no longer be retried — please start a new booking" },
      { status: 409 },
    );
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

  if (insertError) {
    console.error("[api/bookings/:id/payment-intent] failed to insert payments row:", insertError);
    await cancelPaymentIntent(paymentIntent.id).catch((error) => {
      console.error("[api/bookings/:id/payment-intent] failed to cancel orphaned intent:", error);
    });
    await releaseHold();
    return NextResponse.json({ message: "Failed to create a new payment attempt" }, { status: 502 });
  }

  if (priorIntentToCancel) {
    await cancelPaymentIntent(priorIntentToCancel).catch((error) => {
      console.error("[api/bookings/:id/payment-intent] could not cancel the superseded intent:", error);
    });
  }

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
