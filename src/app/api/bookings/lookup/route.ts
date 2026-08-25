import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/server/db";
import { lookupBookingByCodeAndEmail } from "@/server/queries/bookings.query";

const lookupSchema = z.object({
  bookingCode: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { message: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid booking code and email" }, { status: 400 });
  }

  try {
    const booking = await lookupBookingByCodeAndEmail(parsed.data.bookingCode, parsed.data.email);
    if (!booking) {
      // Same message whether code or email is wrong — avoid leaking which matched.
      return NextResponse.json({ message: "No booking found for that code and email" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("[api/bookings/lookup] POST failed:", error);
    return NextResponse.json({ message: "Failed to look up booking" }, { status: 500 });
  }
}
