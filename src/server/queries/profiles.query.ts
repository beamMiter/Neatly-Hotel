import "server-only";
import { createClient } from "@/server/db/supabase-server";
import type { ProfilePrefill } from "@/types/booking";
import type { AccountSummary } from "@/types/account";
import type { OwnProfileForEdit } from "@/types/profile";

type ProfileRow = {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  country: string;
};

// `profiles` is RLS-critical (see AGENTS.md) — must go through the
// request-scoped client (RLS-enforced), never supabaseAdmin/Prisma.
export async function getProfileForBookingPrefill(userId: string): Promise<ProfilePrefill | null> {
  const supabase = await createClient();

  const [{ data: profile, error }, { data: userData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, date_of_birth, country")
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (error) {
    console.error("[profiles] failed to fetch prefill:", error);
    return null;
  }

  if (!profile) return null;

  const row = profile as ProfileRow;
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    country: row.country,
    email: userData.user?.email ?? "",
  };
}

// Lightweight lookup for shared chrome (navbar) — only the two fields it
// renders, so it doesn't pull in booking-prefill fields it never shows.
//
// Callers must pass the authenticated user's email as a fallback: staff/admin
// accounts (staff_members) don't go through the customer /register flow that
// creates a `profiles` row, so an authenticated user can have none at all.
// Silently returning null here would make MainLayout treat a genuinely
// logged-in staff member as logged out — never do that; always resolve to
// *something* displayable for anyone who has a session.
export async function getAccountSummary(userId: string, fallbackEmail: string): Promise<AccountSummary> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profiles] failed to fetch account summary:", error);
  }

  if (!profile) {
    return { firstName: fallbackEmail.split("@")[0] || fallbackEmail, lastName: "", avatarUrl: null };
  }

  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url,
  };
}

// Everything the edit-profile page needs to prefill its form, in one query
// — null means no profile row exists (staff/admin account that never went
// through /register; see updateOwnProfile's NOT_FOUND for the write side).
export async function getOwnProfileForEdit(userId: string): Promise<OwnProfileForEdit | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, date_of_birth, country, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profiles] failed to fetch own profile for edit:", error);
    return null;
  }

  if (!profile) return null;

  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    dateOfBirth: profile.date_of_birth,
    country: profile.country,
    avatarUrl: profile.avatar_url,
  };
}

export type ProfileUpdateFields = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  country: string;
  avatarUrl?: string | null; // omit to leave the existing avatar untouched
};

export type UpdateOwnProfileResult = { ok: true } | { ok: false; code: "NOT_FOUND" | "DB_ERROR" };

// Plain UPDATE through the RLS-bound client — relies entirely on the
// existing "Users can update their own profile" policy (auth.uid() = id).
// Deliberately NOT an upsert: `profiles` has no INSERT policy for
// authenticated users (only the /register flow, via supabaseAdmin, may
// create a row — see api/register/route.ts), so a staff/admin account with
// no profile yet gets NOT_FOUND here rather than silently gaining one
// through a side door with no username set (profiles.username is NOT NULL
// + UNIQUE, and this form never collects one).
export async function updateOwnProfile(userId: string, fields: ProfileUpdateFields): Promise<UpdateOwnProfileResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: fields.firstName,
      last_name: fields.lastName,
      phone: fields.phone,
      date_of_birth: fields.dateOfBirth,
      country: fields.country,
      ...(fields.avatarUrl !== undefined ? { avatar_url: fields.avatarUrl } : {}),
    })
    .eq("id", userId)
    .select("id");

  if (error) {
    console.error("[profiles] failed to update own profile:", error);
    return { ok: false, code: "DB_ERROR" };
  }

  // RLS silently filters out non-matching rows rather than erroring — zero
  // rows back means either no profile exists yet, or (impossible here since
  // we always pass the caller's own id) it belongs to someone else.
  if (!data || data.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true };
}
