import { NextResponse } from "next/server";
import { createClient } from "@/server/db/supabase-server";

// Landing point for the reset-password email link: exchanges the one-time
// PKCE code for a real session (so /forgot-password/reset can call
// supabase.auth.updateUser()), then hands off to the actual form.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/forgot-password/reset", request.url));
    }
  }

  return NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
}
