import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import { adminEditDatesSchema } from "@/features/customer-booking/validations";
import {
  AmountTooLowError,
  InvalidPromoError,
} from "@/server/queries/bookings.query";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";
import {
  AdminBookingRoomConflictError,
  PaymentMethodRequiredError,
  updateBookingDates,
} from "@/server/queries/admin-booking-edit.query";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { message: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminEditDatesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid date change payload" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const result = await updateBookingDates(id, parsed.data);

    return NextResponse.json({
      message: "Booking dates updated",
      ...result,
    });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof AdminBookingRoomConflictError) {
      return NextResponse.json({ message: error.message, needsNewRoom: true }, { status: 409 });
    }
    if (error instanceof PaymentMethodRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    if (error instanceof InvalidBookingTransitionError || error instanceof InvalidPromoError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    if (error instanceof AmountTooLowError) {
      return NextResponse.json(
        { message: "The amount due is below the minimum card charge" },
        { status: 422 },
      );
    }
    console.error("[api/admin/bookings/dates] PATCH failed:", error);
    return NextResponse.json({ message: "Failed to update booking dates" }, { status: 500 });
  }
}
