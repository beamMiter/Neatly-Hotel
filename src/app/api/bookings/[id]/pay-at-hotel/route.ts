import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { getBookingById, markBookingCashConfirmed } from "@/server/queries/bookings.query";
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

    await markBookingCashConfirmed(id);
    return NextResponse.json({ bookingId: id, paymentMethod: "cash" });
  } catch (error) {
    console.error("[api/bookings/:id/pay-at-hotel] POST failed:", error);
    return NextResponse.json({ message: "Unable to confirm pay at hotel" }, { status: 500 });
  }
}
