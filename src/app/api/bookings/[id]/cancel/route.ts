import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";
import { cancelBooking } from "@/server/queries/bookings.query";
import { bookingAccessErrorResponse } from "@/server/services/booking-access";

type RouteParams = { params: Promise<{ id: string }> };

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
    const { booking, refunded } = await cancelBooking(id, user?.id ?? null);
    return NextResponse.json({ message: "Booking cancelled", booking, refunded });
  } catch (error) {
    const forbidden = bookingAccessErrorResponse(error);
    if (forbidden) return forbidden;
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof InvalidBookingTransitionError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error("[api/bookings/:id/cancel] POST failed:", error);
    return NextResponse.json({ message: "Unable to cancel booking" }, { status: 500 });
  }
}
