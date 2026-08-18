"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/server/db/supabase-server";
import { RECOVERY_COOKIE_NAME } from "./recovery-session";
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

// The reset link has to be absolute, and `Origin` is both client-controlled
// and absent on some form posts — a missing one would otherwise build the
// literal URL "null/forgot-password/confirm". Prefers an explicit
// NEXT_PUBLIC_SITE_URL, then the (proxy-aware) host the request arrived on.
async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  return host ? `${protocol}://${host}` : "";
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
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteOrigin()}/forgot-password/confirm`,
  });

  if (error) {
    // Deliberately not surfaced: an unregistered email is not an error here,
    // and the failures that *are* real (SMTP down, rate limit, redirectTo not
    // in Supabase's allow-list) shouldn't be distinguishable from success by
    // the caller either. Logged so they're still debuggable.
    console.error("[forgotPassword] resetPasswordForEmail failed:", error);
  }

  // Same response whether or not the email is registered — otherwise this
  // endpoint becomes a way to check which emails have an account.
  return { sent: true, message: "If an account exists for that email, a reset link is on its way." };
}

type NewPasswordError = { fieldErrors?: NewPasswordFieldErrors; message?: string };
export type NewPasswordState = NewPasswordError | undefined;

export async function resetPassword(_prevState: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  // Checked before the password is even parsed: an ordinary logged-in session
  // must not be able to set a new password here without the current one.
  const cookieStore = await cookies();
  if (!cookieStore.get(RECOVERY_COOKIE_NAME)) {
    return { message: "This reset link has expired. Request a new one and try again." };
  }

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
    console.error("[resetPassword] updateUser failed:", error);
    return { message: "This reset link has expired. Request a new one and try again." };
  }

  // Retire the recovery session instead of leaving it signed in: whoever
  // opened the link would otherwise stay logged into the account, and the
  // new password should be what gets them back in.
  cookieStore.delete(RECOVERY_COOKIE_NAME);
  await supabase.auth.signOut();

  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
