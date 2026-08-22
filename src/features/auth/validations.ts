import { z } from "zod";
import { differenceInYears } from "date-fns";
import { COUNTRIES } from "@/lib/countries";
import { NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";

// Mirrors DateOfBirthField's calendar startMonth (today - 120y) so a
// direct API call can't submit a birth date the UI would never let a
// user pick.
const MAX_AGE_YEARS = 120;
const MIN_AGE_YEARS = 18;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordFieldErrors = Partial<Record<keyof ForgotPasswordInput, string>>;

export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type NewPasswordFieldErrors = Partial<Record<keyof NewPasswordInput, string>>;

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name is too long")
    .regex(NAME_PATTERN, "First name can only contain letters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name is too long")
    .regex(NAME_PATTERN, "Last name can only contain letters"),
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
    .regex(PHONE_PATTERN, "Enter a valid phone number (9-10 digits, starting with 0)"),
  dateOfBirth: z
    .date({ message: "Date of birth is required" })
    .max(new Date(), "Date of birth cannot be in the future")
    .refine((date) => differenceInYears(new Date(), date) >= MIN_AGE_YEARS, {
      message: `You must be at least ${MIN_AGE_YEARS} years old to register`,
    })
    .refine((date) => differenceInYears(new Date(), date) <= MAX_AGE_YEARS, {
      message: "Please enter a valid date of birth",
    }),
  country: z.enum(COUNTRIES, { message: "Select a valid country" }),
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

const REGISTER_TEXT_FIELDS = [
  "firstName",
  "lastName",
  "username",
  "email",
  "password",
  "confirmPassword",
  "phone",
  "dateOfBirth",
  "country",
] as const;

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export type ParseRegisterFormDataResult =
  | { success: true; data: RegisterInput; photo: File | null }
  | { success: false; fieldErrors: RegisterFieldErrors };

// The submit request is multipart/form-data (not JSON) so the profile
// picture file can ride along. An invalid/oversized photo is dropped
// rather than failing the whole submission, since it's an optional field.
export function parseRegisterFormData(formData: FormData): ParseRegisterFormDataResult {
  const record: Record<string, unknown> = {};
  for (const key of REGISTER_TEXT_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string") record[key] = value;
  }

  const parsed = parseRegisterPayload(record);
  if (!parsed.success) {
    return parsed;
  }

  const photoEntry = formData.get("profilePicture");
  const isValidPhoto =
    photoEntry instanceof File &&
    photoEntry.size > 0 &&
    photoEntry.size <= MAX_PHOTO_SIZE_BYTES &&
    photoEntry.type.startsWith("image/");

  return { success: true, data: parsed.data, photo: isValidPhoto ? (photoEntry as File) : null };
}
