import { createClient } from "@/server/db/supabase-server";

export type StaffRole = "admin";

export async function getStaffRole(userId: string): Promise<StaffRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  return data.role as StaffRole;
}

export async function isStaff(userId: string): Promise<boolean> {
  return (await getStaffRole(userId)) !== null;
}
