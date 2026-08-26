import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { isIsoDate } from "@/features/booking/date-rules";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";
import { BookingConflictError, changeBookingDates } from "@/server/queries/bookings.query";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const checkIn = typeof body?.checkIn === "string" ? body.checkIn : "";
  const checkOut = typeof body?.checkOut === "string" ? body.checkOut : "";
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkIn >= checkOut) {
    return NextResponse.json({ message: "Invalid check-in/check-out dates" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id } = await params;

  try {
    const booking = await changeBookingDates(id, user?.id ?? null, checkIn, checkOut);
    return NextResponse.json({ message: "Dates updated", booking });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof InvalidBookingTransitionError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error("[api/bookings/:id/change-date] POST failed:", error);
    return NextResponse.json({ message: "Unable to change booking dates" }, { status: 500 });
  }
}
