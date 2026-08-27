import "server-only";
import { createClient } from "@/server/db/supabase-server";
import type { ProfilePrefill } from "@/types/booking";
import type { AccountSummary } from "@/types/account";

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
