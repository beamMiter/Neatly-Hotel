import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  getBookingById,
  syncBookingPaymentFromStripe,
} from "@/server/queries/bookings.query";
import { BookingNotFoundError } from "@/server/queries/customer-bookings.query";
import { bookingAccessErrorResponse } from "@/server/services/booking-access";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Asks Stripe whether this booking's latest PaymentIntent succeeded, then
 * marks the booking paid (and sends the guest confirmation email).
 *
 * Needed for local/dev when `stripe listen` is not running — the success page
 * polls this so card/PromptPay still confirm without the webhook.
 * Safe in production too: idempotent and Stripe-verified.
 */
export async function POST(_request: Request, { params }: RouteParams) {
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
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentMethod === "cash") {
      return NextResponse.json({ booking, synced: false });
    }

    await syncBookingPaymentFromStripe(id);
    const refreshed = await getBookingById(id, user?.id ?? null);
    return NextResponse.json({ booking: refreshed, synced: true });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }
    console.error("[api/bookings/:id/confirm-payment] POST failed:", error);
    return NextResponse.json({ message: "Unable to confirm payment" }, { status: 500 });
  }
}
