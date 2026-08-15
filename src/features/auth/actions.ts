"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import { loginSchema, type LoginFieldErrors } from "./validations";
import { getStaffRole } from "@/server/queries/staff-members.query";

type LoginError = { fieldErrors?: LoginFieldErrors; message?: string };
export type LoginState = LoginError | undefined;

async function signIn(formData: FormData): Promise<LoginError | { userId: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as LoginFieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { message: "Invalid email or password" };
  }

  return { userId: data.user.id };
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const result = await signIn(formData);
  if (!("userId" in result)) {
    return result;
  }

  // One login for everyone — where you land depends on whether the account
  // has a staff_members row, not which page you happened to submit from.
  const role = await getStaffRole(result.userId);
  // /room-management is the only (admin) page built so far (from
  // feat/room-management-list) — the sidebar's other links 404 until
  // their pages exist.
  redirect(role ? "/room-management" : "/");
}

export async function agentRegister(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as LoginFieldErrors };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError) {
    const isDuplicateEmail = authError.code === "email_exists" || authError.status === 422;
    if (isDuplicateEmail) {
      return { fieldErrors: { email: "This email is already registered" } };
    }
    console.error("[agentRegister] auth.admin.createUser failed:", authError);
    return { message: "Registration failed. Please try again." };
  }

  const userId = authData.user.id;
  const { error: staffError } = await supabaseAdmin
    .from("staff_members")
    .insert({ user_id: userId, role: "agent" });

  if (staffError) {
    console.error("[agentRegister] staff_members insert failed:", staffError);
    // Avoid leaving an orphaned auth user (with no staff record) blocking a retry.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { message: "Registration failed. Please try again." };
  }

  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
