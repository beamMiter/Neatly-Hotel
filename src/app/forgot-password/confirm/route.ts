import { NextResponse } from "next/server";
import { createClient } from "@/server/db/supabase-server";
import { RECOVERY_COOKIE_NAME, RECOVERY_COOKIE_MAX_AGE_SECONDS } from "@/features/auth/recovery-session";

// Landing point for the reset-password email link: exchanges the one-time
// PKCE code for a real session (so /forgot-password/reset can call
// supabase.auth.updateUser()), then hands off to the actual form.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(new URL("/forgot-password/reset", request.url));
      // Proves the session behind the reset form came from the emailed link
      // rather than from an ordinary login. See recovery-session.ts.
      response.cookies.set({
        name: RECOVERY_COOKIE_NAME,
        value: "1",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/forgot-password",
        maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
      });
      return response;
    }

    console.error("[forgot-password/confirm] exchangeCodeForSession failed:", error);
  }

  return NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
}
