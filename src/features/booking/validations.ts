import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";
import { NAME_PATTERN, PHONE_PATTERN, UUID_PATTERN } from "@/lib/validation-patterns";
import { MAX_ADD_ON_COUNT } from "@/lib/addon-pricing";

export const basicInfoSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50).regex(NAME_PATTERN, "First name can only contain letters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50).regex(NAME_PATTERN, "Last name can only contain letters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number (9-10 digits, starting with 0)"),
  // Only checked against "not in the future" — a booking guest isn't
  // necessarily the account holder (e.g. a child on the reservation), so
  // this intentionally doesn't reuse register's 18+ age gate.
  dateOfBirth: z
    .date({ message: "Date of birth is required" })
    .max(new Date(), "Date of birth cannot be in the future"),
  country: z.enum(COUNTRIES, { message: "Select a valid country" }),
});
export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type BasicInfoFieldErrors = Partial<Record<keyof BasicInfoInput, string>>;

export const specialRequestSchema = z.object({
  standardRequests: z.array(z.string()).default([]),
  // Codes only, plus an optional count — no prices. `count` only means
  // anything for per_leg/per_day_guest items (see addon-pricing.ts); it's
  // bounded here regardless, since this is the trust boundary and every
  // billing type this project has caps at 2.
  specialRequests: z
    .array(
      z.object({
        code: z.string().min(1),
        count: z.coerce.number().int().min(1).max(MAX_ADD_ON_COUNT).optional(),
      }),
    )
    .max(50)
    .default([]),
  additionalRequest: z.string().trim().max(500).optional(),
});
export type SpecialRequestInput = z.infer<typeof specialRequestSchema>;

export const paymentMethodSchema = z.object({
  paymentMethod: z.enum(["credit_card", "cash"]),
  promoCode: z.string().trim().max(30).optional(),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

// Full submit payload for POST /api/bookings. Deliberately has no price/
// total fields — the client only ever sends selections, the server
// recomputes every amount from the DB (see bookings.query.ts).
export const createBookingSchema = basicInfoSchema
  .merge(specialRequestSchema)
  .merge(paymentMethodSchema)
  .extend({
    roomTypeId: z.string().regex(UUID_PATTERN, "Invalid room type"),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    guests: z.coerce.number().int().min(1).max(8),
    rooms: z.coerce.number().int().min(1).max(3),
  });
export type CreateBookingPayload = z.infer<typeof createBookingSchema>;
export type CreateBookingFieldErrors = Partial<Record<keyof CreateBookingPayload, string>>;

export type ParseCreateBookingResult =
  | { success: true; data: CreateBookingPayload }
  | { success: false; fieldErrors: CreateBookingFieldErrors };

// Shared by the API route and (pre-submit) the wizard's final step — the
// wire payload is JSON, so dateOfBirth arrives as an ISO string and needs
// coercing into a Date before it hits the schema.
export function parseCreateBookingPayload(body: unknown): ParseCreateBookingResult {
  if (!body || typeof body !== "object") {
    return { success: false, fieldErrors: {} };
  }

  const record = body as Record<string, unknown>;
  const result = createBookingSchema.safeParse({
    ...record,
    dateOfBirth:
      typeof record.dateOfBirth === "string" && record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
  });

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: CreateBookingFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CreateBookingFieldErrors | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, fieldErrors };
}
