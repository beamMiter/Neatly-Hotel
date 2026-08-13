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

export type ParseRegisterPayloadResult =
  | { success: true; data: RegisterInput }
  | { success: false; fieldErrors: RegisterFieldErrors };

// Shared by the register API route and the proxy that guards it: coerces the
// wire-format (JSON) body into what registerSchema expects and maps zod
// issues into per-field messages the client already knows how to render.
export function parseRegisterPayload(body: unknown): ParseRegisterPayloadResult {
  if (!body || typeof body !== "object") {
    return { success: false, fieldErrors: {} };
  }

  const record = body as Record<string, unknown>;
  const result = registerSchema.safeParse({
    ...record,
    dateOfBirth:
      typeof record.dateOfBirth === "string" && record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
  });

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: RegisterFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof RegisterFieldErrors | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, fieldErrors };
}
