import { createClient } from "@/server/db/supabase-server";

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
};

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    username: data.username,
    avatarUrl: data.avatar_url,
  };
}
