import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  AmountTooLowError,
  createTopUpPaymentAttempt,
  createInitialPaymentAttempt,
  extendBookingHold,
  getBookingById,
  getBookingPaymentBalance,
  isTopUpPaymentEligible,
  PaymentIntentBlockedError,
} from "@/server/queries/bookings.query";
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
export async function handleBookingPayment(request: Request, { params }: RouteParams) {
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

  try {
    const balance = await getBookingPaymentBalance(id);
    if (isTopUpPaymentEligible(booking, balance)) {
      const attempt = await createTopUpPaymentAttempt(id, balance.amountDue);
      return NextResponse.json({ ...attempt, amountDue: balance.amountDue });
    }
    if (!(await extendBookingHold(id, viewerId))) {
      return NextResponse.json({ message: "This booking can no longer be retried. Please start a new booking." }, { status: 409 });
    }
    return NextResponse.json(await createInitialPaymentAttempt(id, booking.totalAmount));
  } catch (error) {
    const forbidden = bookingAccessErrorResponse(error);
    if (forbidden) return forbidden;
    if (error instanceof PaymentIntentBlockedError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof AmountTooLowError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    console.error("[booking payment] failed to create payment:", error);
    return NextResponse.json({ message: "Unable to verify or collect payment. Please try again." }, { status: 502 });
  }
}
