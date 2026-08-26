import { z } from "zod";
import { hasDatabaseUrl } from "@/server/db";
import { searchRoomTypes } from "@/server/queries/booking-search.query";
import { BookingConflictError, InvalidGuestsError, RoomTypeNotFoundError } from "@/server/queries/bookings.query";
import { getActiveAdminUser } from "@/server/services/admin-auth";
import {
  AdminBookingValidationError,
  createBookingForSupportConversation,
  getSupportBookingIdentity,
  SupportMemberSelectionError,
} from "@/server/services/live-support-booking.service";

const availabilitySchema = z.object({
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guests: z.coerce.number().int().min(1).max(8),
  rooms: z.coerce.number().int().min(1).max(3),
});

export async function GET(request: Request) {
  if (!await getActiveAdminUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const conversationId = params.get("conversationId");

  try {
    if (conversationId) {
      const identity = await getSupportBookingIdentity(conversationId, params.get("phone"), params.get("email"));
      return Response.json({ identity });
    }

    const parsed = availabilitySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return Response.json({ error: "Invalid availability search" }, { status: 400 });
    return Response.json({ rooms: await searchRoomTypes(parsed.data) });
  } catch (error) {
    if (error instanceof AdminBookingValidationError) return Response.json({ error: error.message }, { status: 422 });
    console.error("Live support booking lookup failed:", error);
    return Response.json({ error: "Unable to check booking details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getActiveAdminUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabaseUrl()) return Response.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const parsed = z.object({
    conversationId: z.string().uuid(),
    selectedCustomerId: z.string().uuid().nullable().optional(),
    emailVerificationToken: z.string().min(1).max(1024).optional(),
    booking: z.unknown(),
  }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid booking request" }, { status: 400 });

  try {
    const result = await createBookingForSupportConversation(parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SupportMemberSelectionError) {
      return Response.json({ error: error.message, matches: error.matches }, { status: 409 });
    }
    if (error instanceof AdminBookingValidationError || error instanceof InvalidGuestsError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof BookingConflictError) return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof RoomTypeNotFoundError) return Response.json({ error: "Room type was not found" }, { status: 404 });
    console.error("Admin support booking creation failed:", error);
    return Response.json({ error: "Unable to create booking" }, { status: 500 });
  }
}
