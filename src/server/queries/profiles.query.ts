import "server-only";
import { createClient } from "@/server/db/supabase-server";
import type { ProfilePrefill } from "@/types/booking";

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
