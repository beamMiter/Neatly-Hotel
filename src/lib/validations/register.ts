import { z } from "zod";
import { differenceInYears } from "date-fns";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{9,10}$/, "Enter a valid phone number (9-10 digits)"),
  dateOfBirth: z
    .date({ message: "Date of birth is required" })
    .max(new Date(), "Date of birth cannot be in the future")
    .refine((date) => differenceInYears(new Date(), date) >= 18, {
      message: "You must be at least 18 years old to register",
    }),
  country: z.string().trim().min(1, "Country is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFieldErrors = Partial<Record<keyof RegisterInput, string>>;

// Kept outside the schema: zod skips an object-level `.refine()` when a
// sibling field (e.g. dateOfBirth) already failed its own base validation,
// which would hide this error in the common case of an incomplete form.
export function getPasswordMismatchError(password: string, confirmPassword: string): string | undefined {
  if (password && confirmPassword && password !== confirmPassword) {
    return "Passwords do not match";
  }
  return undefined;
}
