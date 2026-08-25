import "server-only";
import { createClient } from "@/server/db/supabase-server";
import { getStaffRole } from "@/server/queries/staff-members.query";

export async function getActiveAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (await getStaffRole(user.id)) !== "admin") return null;
  return user;
}
