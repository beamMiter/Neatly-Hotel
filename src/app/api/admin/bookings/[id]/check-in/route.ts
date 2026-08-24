import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { getStaffRole } from "@/server/queries/staff-members.query";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
  checkInBooking,
} from "@/server/queries/customer-bookings.query";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { message: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = await getStaffRole(user.id);
  if (!role) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const booking = await checkInBooking(id);
    return NextResponse.json({ message: "Checked in", booking });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof InvalidBookingTransitionError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("[api/admin/bookings/check-in] POST failed:", error);
    return NextResponse.json({ message: "Failed to check in booking" }, { status: 500 });
  }
}
