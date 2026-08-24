import { z } from "zod";
import { UUID_PATTERN } from "@/lib/validation-patterns";

export const validatePromoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Promotion code is required")
    .max(40, "Promotion code is too long"),
  roomTypeId: z
    .string()
    .trim()
    .regex(UUID_PATTERN, "A valid room type id is required"),
  subtotal: z.coerce
    .number()
    .finite("Subtotal must be a number")
    .positive("Subtotal must be greater than 0"),
});

export type ValidatePromoInput = z.infer<typeof validatePromoSchema>;
export type ValidatePromoFieldErrors = Partial<Record<keyof ValidatePromoInput, string>>;

export function parseValidatePromoBody(
  body: unknown,
):
  | { success: true; data: ValidatePromoInput }
  | { success: false; fieldErrors: ValidatePromoFieldErrors; message: string } {
  const result = validatePromoSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors: ValidatePromoFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ValidatePromoInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      fieldErrors,
      message: "Validation failed",
    };
  }

  return {
    success: true,
    data: {
      ...result.data,
      code: result.data.code.trim().toUpperCase(),
    },
  };
}
