import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { getBookingById } from "@/server/queries/bookings.query";

type RouteParams = { params: Promise<{ id: string }> };

// Polled by the success page — see plan §9: confirmPayment resolves before
// the webhook lands, so the UI must ask the server for the real status
// rather than trusting the client-side Stripe result.
export async function GET(request: Request, { params }: RouteParams) {
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

  try {
    const booking = await getBookingById(id, user.id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("[api/bookings/:id] GET failed:", error);
    return NextResponse.json({ message: "Failed to load booking" }, { status: 500 });
  }
}
