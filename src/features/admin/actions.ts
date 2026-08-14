"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/db/supabase-server";

export type LoginState = { error?: string };

export async function signInAgent(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password" };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();

  if (profile?.role !== "agent") {
    await supabase.auth.signOut();
    return { error: "This account does not have agent access" };
  }

  redirect("/admin/room-property");
}

export async function signOutAgent() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
