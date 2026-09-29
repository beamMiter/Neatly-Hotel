import "server-only";
import { createClient } from "@/server/db/supabase-server";
import { getStaffAuthContext } from "@/server/services/authorization";

export async function getActiveAdminUser() {
  const auth = await getStaffAuthContext();
  if (!auth) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
