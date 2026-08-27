import { z } from "zod";
import { differenceInYears } from "date-fns";
import { COUNTRIES } from "@/lib/countries";
import { NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";

// Same bounds as registerSchema (src/features/auth/validations.ts) — a
// profile edit shouldn't be able to reach a date the register form itself
// would never let you pick.
const MAX_AGE_YEARS = 120;
const MIN_AGE_YEARS = 18;

// Editable subset of `profiles`: no username (would need a uniqueness
// re-check and can break existing login-by-username), no email/password
// (those are Supabase Auth fields with their own change flows, not this
// table) — just the fields the register form itself lets someone set once.
export const profileUpdateSchema = z.object({
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
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid phone number (9-10 digits, starting with 0)"),
  dateOfBirth: z
    .date({ message: "Date of birth is required" })
    .max(new Date(), "Date of birth cannot be in the future")
    .refine((date) => differenceInYears(new Date(), date) >= MIN_AGE_YEARS, {
      message: `You must be at least ${MIN_AGE_YEARS} years old`,
    })
    .refine((date) => differenceInYears(new Date(), date) <= MAX_AGE_YEARS, {
      message: "Please enter a valid date of birth",
    }),
  country: z.enum(COUNTRIES, { message: "Select a valid country" }),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ProfileUpdateFieldErrors = Partial<Record<keyof ProfileUpdateInput, string>>;

export type ParseProfileUpdatePayloadResult =
  | { success: true; data: ProfileUpdateInput }
  | { success: false; fieldErrors: ProfileUpdateFieldErrors };

function parseProfileUpdatePayload(body: Record<string, unknown>): ParseProfileUpdatePayloadResult {
  const result = profileUpdateSchema.safeParse({
    ...body,
    dateOfBirth: typeof body.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
  });

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: ProfileUpdateFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ProfileUpdateFieldErrors | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, fieldErrors };
}

const PROFILE_TEXT_FIELDS = ["firstName", "lastName", "phone", "dateOfBirth", "country"] as const;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export type ParseProfileUpdateFormDataResult =
  | { success: true; data: ProfileUpdateInput; photo: File | null; removeAvatar: boolean }
  | { success: false; fieldErrors: ProfileUpdateFieldErrors };

// Multipart (not JSON) so the new avatar, if any, rides along in the same
// request — mirrors parseRegisterFormData (src/features/auth/validations.ts).
export function parseProfileUpdateFormData(formData: FormData): ParseProfileUpdateFormDataResult {
  const record: Record<string, unknown> = {};
  for (const key of PROFILE_TEXT_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string") record[key] = value;
  }

  const parsed = parseProfileUpdatePayload(record);
  if (!parsed.success) return parsed;

  const photoEntry = formData.get("profilePicture");
  const isValidPhoto =
    photoEntry instanceof File &&
    photoEntry.size > 0 &&
    photoEntry.size <= MAX_PHOTO_SIZE_BYTES &&
    photoEntry.type.startsWith("image/");
  const photo = isValidPhoto ? (photoEntry as File) : null;

  // A fresh pick always wins over "remove" — the form only ever sends both
  // if someone deleted the avatar then picked a new one in the same visit.
  const removeAvatar = !photo && formData.get("removeAvatar") === "true";

  return { success: true, data: parsed.data, photo, removeAvatar };
}

// Staff/admin editable subset — no dateOfBirth/country (nothing in the
// product reads those for a staff account; see StaffProfileForEdit in
// src/types/profile.ts).
export const staffProfileUpdateSchema = z.object({
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
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid phone number (9-10 digits, starting with 0)"),
});

export type StaffProfileUpdateInput = z.infer<typeof staffProfileUpdateSchema>;
export type StaffProfileUpdateFieldErrors = Partial<Record<keyof StaffProfileUpdateInput, string>>;

const STAFF_PROFILE_TEXT_FIELDS = ["firstName", "lastName", "phone"] as const;

export type ParseStaffProfileUpdateFormDataResult =
  | { success: true; data: StaffProfileUpdateInput; photo: File | null; removeAvatar: boolean }
  | { success: false; fieldErrors: StaffProfileUpdateFieldErrors };

export function parseStaffProfileUpdateFormData(formData: FormData): ParseStaffProfileUpdateFormDataResult {
  const record: Record<string, unknown> = {};
  for (const key of STAFF_PROFILE_TEXT_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string") record[key] = value;
  }

  const result = staffProfileUpdateSchema.safeParse(record);
  if (!result.success) {
    const fieldErrors: StaffProfileUpdateFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof StaffProfileUpdateFieldErrors | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, fieldErrors };
  }

  const photoEntry = formData.get("profilePicture");
  const isValidPhoto =
    photoEntry instanceof File &&
    photoEntry.size > 0 &&
    photoEntry.size <= MAX_PHOTO_SIZE_BYTES &&
    photoEntry.type.startsWith("image/");
  const photo = isValidPhoto ? (photoEntry as File) : null;
  const removeAvatar = !photo && formData.get("removeAvatar") === "true";

  return { success: true, data: result.data, photo, removeAvatar };
}
