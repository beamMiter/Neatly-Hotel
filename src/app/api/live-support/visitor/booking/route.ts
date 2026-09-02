import { z } from "zod";
import { MAX_ADD_ON_COUNT } from "@/lib/addon-pricing";
import { confirmVisitorBookingSpecialRequests } from "@/server/services/live-support-booking.service";
import { AdminBookingValidationError } from "@/server/services/live-support-booking.service";
import { BookingNotFoundError, InvalidBookingTransitionError } from "@/server/queries/customer-bookings.query";

const requestSchema = z.object({
  visitorToken: z.string().uuid(),
  bookingId: z.string().uuid(),
  specialRequests: z.array(z.object({
    code: z.string().trim().min(1).max(100),
    count: z.number().int().min(1).max(MAX_ADD_ON_COUNT).optional(),
  }).strict()).max(50),
}).strict();

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid special request selection" }, { status: 400 });

  try {
    return Response.json(await confirmVisitorBookingSpecialRequests(parsed.data));
  } catch (error) {
    if (error instanceof AdminBookingValidationError) return Response.json({ error: error.message }, { status: 403 });
    if (error instanceof BookingNotFoundError) return Response.json({ error: "Booking was not found" }, { status: 404 });
    if (error instanceof InvalidBookingTransitionError) return Response.json({ error: error.message }, { status: 409 });
    console.error("Unable to confirm visitor special requests", error);
    return Response.json({ error: "Unable to save special requests" }, { status: 500 });
  }
}
