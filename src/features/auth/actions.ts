"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/server/db/supabase-server";
import {
  loginSchema,
  forgotPasswordSchema,
  newPasswordSchema,
  getPasswordMismatchError,
  type LoginFieldErrors,
  type ForgotPasswordFieldErrors,
  type NewPasswordFieldErrors,
} from "./validations";
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

type ForgotPasswordError = { fieldErrors?: ForgotPasswordFieldErrors; message?: string; sent?: boolean };
export type ForgotPasswordState = ForgotPasswordError | undefined;

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as ForgotPasswordFieldErrors };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/forgot-password/confirm`,
  });

  // Same response whether or not the email is registered — otherwise this
  // endpoint becomes a way to check which emails have an account.
  return { sent: true, message: "If an account exists for that email, a reset link is on its way." };
}

type NewPasswordError = { fieldErrors?: NewPasswordFieldErrors; message?: string };
export type NewPasswordState = NewPasswordError | undefined;

export async function resetPassword(_prevState: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as NewPasswordFieldErrors };
  }

  const mismatchError = getPasswordMismatchError(parsed.data.password, parsed.data.confirmPassword);
  if (mismatchError) {
    return { fieldErrors: { confirmPassword: mismatchError } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    // Most likely: the recovery link expired or was already used, so there's
    // no active recovery session to attach the new password to.
    return { message: "This reset link has expired. Request a new one and try again." };
  }

  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
