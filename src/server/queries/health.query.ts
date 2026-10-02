import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";

// A trivial read through the Supabase REST API (not a raw Postgres
// connection) — Supabase's free-tier auto-pause tracks API activity, so this
// is what the keep-alive cron actually needs to produce. `staff_members` is
// small and has existed since the earliest migration; its primary key is
// `user_id`, not `id` (see supabase/migrations/0003_staff_members.sql).
export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("staff_members").select("user_id").limit(1);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
