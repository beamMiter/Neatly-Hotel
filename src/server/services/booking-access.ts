import "server-only";
import { NextResponse } from "next/server";
import { BookingAccessDeniedError } from "@/lib/booking-access";
import { getBookingById } from "@/server/queries/bookings.query";
import type { BookingRecord } from "@/types/booking";

export function bookingAccessErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof BookingAccessDeniedError)) return null;
  return NextResponse.json({ message: error.message }, { status: error.status });
}

/** Server pages treat forbidden bookings the same as not found (redirect away). */
export async function getBookingForCustomerPage(
  id: string,
  viewerId: string | null,
): Promise<BookingRecord | null> {
  try {
    return await getBookingById(id, viewerId);
  } catch (error) {
    if (error instanceof BookingAccessDeniedError) return null;
    throw error;
  }
}
