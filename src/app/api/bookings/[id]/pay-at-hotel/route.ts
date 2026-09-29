import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  BookingConflictError,
  getBookingById,
  markBookingCashConfirmed,
  resolvePriorIntentToCancel,
} from "@/server/queries/bookings.query";
import { cancelPaymentIntent } from "@/server/payments/stripe";
import { bookingAccessErrorResponse } from "@/server/services/booking-access";
import { assertEmailVerificationToken } from "@/server/queries/email-otp.query";
import { BOOKING_EMAIL_VERIFICATION_HEADER } from "@/lib/booking-email-verification";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id } = await params;

  try {
    let booking;
    try {
      booking = await getBookingById(id, user?.id ?? null);
    } catch (error) {
      const forbidden = bookingAccessErrorResponse(error);
      if (forbidden) return forbidden;
      throw error;
    }
    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    if (!user && !assertEmailVerificationToken(
      booking.guestInfo.email,
      request.headers.get(BOOKING_EMAIL_VERIFICATION_HEADER) ?? "",
    )) {
      return NextResponse.json({ message: "Please verify your email before confirming this booking" }, { status: 403 });
    }
    if (booking.status !== "pending_payment" || booking.paymentStatus !== "pending") {
      return NextResponse.json({ message: "This booking is no longer awaiting payment" }, { status: 409 });
    }

    const priorResolution = await resolvePriorIntentToCancel(id);
    if ("readError" in priorResolution) {
      return NextResponse.json({ message: "Unable to switch payment method" }, { status: 502 });
    }
    if ("blocked" in priorResolution) {
      return NextResponse.json({ message: priorResolution.blocked }, { status: 409 });
    }
    if (priorResolution.priorIntentToCancel) {
      try {
        await cancelPaymentIntent(priorResolution.priorIntentToCancel);
      } catch (error) {
        console.error("[api/bookings/:id/pay-at-hotel] failed to cancel prior intent:", error);
        return NextResponse.json({ message: "Unable to switch payment method" }, { status: 502 });
      }
    }

    const confirmed = await markBookingCashConfirmed(id);
    if (!confirmed) {
      return NextResponse.json({ message: "This booking can no longer be confirmed" }, { status: 409 });
    }
    return NextResponse.json({ bookingId: id, paymentMethod: "cash" });
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        { message: "The assigned room is no longer available — please start a new booking" },
        { status: 409 },
      );
    }
    console.error("[api/bookings/:id/pay-at-hotel] POST failed:", error);
    return NextResponse.json({ message: "Unable to confirm pay at hotel" }, { status: 500 });
  }
}
