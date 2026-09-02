import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import { adminUpgradeRoomSchema } from "@/features/customer-booking/validations";
import {
  AmountTooLowError,
  InvalidPromoError,
  RoomTypeNotFoundError,
} from "@/server/queries/bookings.query";
import {
  BookingNotFoundError,
  InvalidBookingTransitionError,
} from "@/server/queries/customer-bookings.query";
import {
  AdminBookingUpgradeUnavailableError,
  PaymentMethodRequiredError,
  upgradeBookingRoom,
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
  const parsed = adminUpgradeRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid room upgrade payload" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const result = await upgradeBookingRoom(id, parsed.data);

    return NextResponse.json({
      message: "Booking room upgraded",
      ...result,
    });
  } catch (error) {
    if (error instanceof BookingNotFoundError || error instanceof RoomTypeNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof AdminBookingUpgradeUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
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
    console.error("[api/admin/bookings/room] PATCH failed:", error);
    return NextResponse.json({ message: "Failed to upgrade booking room" }, { status: 500 });
  }
}
