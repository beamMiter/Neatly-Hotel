import { z } from "zod";
import { specialRequestSchema } from "@/features/booking/validations";
import { UUID_PATTERN } from "@/lib/validation-patterns";

const adminEditPaymentMethodSchema = z.enum(["credit_card", "cash"]);

export const adminEditSpecialRequestsSchema = specialRequestSchema.extend({
  additionalRequest: z.string().trim().max(500).nullable().optional(),
  paymentMethod: adminEditPaymentMethodSchema.optional(),
});
export type AdminEditSpecialRequestsPayload = z.infer<typeof adminEditSpecialRequestsSchema>;

export const adminEditDatesSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in must be YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out must be YYYY-MM-DD"),
  paymentMethod: adminEditPaymentMethodSchema.optional(),
});
export type AdminEditDatesPayload = z.infer<typeof adminEditDatesSchema>;

export const adminUpgradeRoomSchema = z.object({
  roomTypeId: z.string().regex(UUID_PATTERN, "Invalid room type"),
  paymentMethod: adminEditPaymentMethodSchema.optional(),
});
export type AdminUpgradeRoomPayload = z.infer<typeof adminUpgradeRoomSchema>;
