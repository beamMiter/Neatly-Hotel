import { createClient } from "@/server/db/supabase-server";
import type { StaffProfileForEdit } from "@/types/profile";

export type StaffRole = "admin";

export async function getStaffRole(userId: string): Promise<StaffRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !data.is_active || data.role !== "admin") return null;

  return "admin";
}

export async function isStaff(userId: string): Promise<boolean> {
  return (await getStaffRole(userId)) !== null;
}

// Editable identity for a staff/admin account — own table, own columns
// (202608270001_staff_members_profile_fields.sql), separate from customer
// `profiles` per the team's call. Row always exists once someone is staff
// (created at admin bootstrap, see 0003_staff_members.sql) — the new columns
// just start out null until the first edit.
export async function getOwnStaffProfileForEdit(userId: string): Promise<StaffProfileForEdit | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select("first_name, last_name, phone, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[staff-members] failed to fetch own profile for edit:", error);
    return null;
  }

  if (!data) return null;

  return {
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    phone: data.phone ?? "",
    avatarUrl: data.avatar_url,
  };
}

export type StaffProfileUpdateFields = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl?: string | null; // omit to leave the existing avatar untouched
};

// Plain UPDATE through the RLS-bound client. Relies on a column-level grant
// (authenticated may only UPDATE first_name/last_name/phone/avatar_url, never
// role/is_active — see the migration) plus a row-level policy scoped to
// auth.uid() = user_id, so a staff member can only ever touch their own
// profile fields, never anyone else's row or their own admin flags.
export async function updateOwnStaffProfile(
  userId: string,
  fields: StaffProfileUpdateFields,
): Promise<{ ok: true } | { ok: false; code: "DB_ERROR" }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_members")
    .update({
      first_name: fields.firstName,
      last_name: fields.lastName,
      phone: fields.phone,
      ...(fields.avatarUrl !== undefined ? { avatar_url: fields.avatarUrl } : {}),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[staff-members] failed to update own profile:", error);
    return { ok: false, code: "DB_ERROR" };
  }

  return { ok: true };
}
