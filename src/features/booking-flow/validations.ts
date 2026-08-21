import { z } from "zod";

export const bookingBasicInfoSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{9,10}$/, "Enter a valid phone number (9-10 digits)"),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth"),
  country: z.string().trim().min(1, "Country is required"),
});

export type BookingBasicInfoInput = z.infer<typeof bookingBasicInfoSchema>;
export type BookingBasicInfoFieldErrors = Partial<Record<keyof BookingBasicInfoInput, string>>;

export function parseBookingBasicInfo(
  input: unknown,
): { success: true; data: BookingBasicInfoInput } | { success: false; fieldErrors: BookingBasicInfoFieldErrors } {
  const result = bookingBasicInfoSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: BookingBasicInfoFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof BookingBasicInfoInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, fieldErrors };
  }
  return { success: true, data: result.data };
}
