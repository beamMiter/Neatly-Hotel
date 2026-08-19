import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase access tokens expire after an hour and are renewed with the refresh
// token. That renewal has to write the rotated tokens back to the cookie, and a
// Server Component can't set cookies — supabase-server.ts swallows the attempt
// there on purpose. The proxy is the one place on a plain navigation that still
// can, so without this pass a session simply dies at the 60 minute mark even
// though its refresh token is still good.
//
// Refresh token rotation makes skipping it worse than a no-op: the server
// consumes the old refresh token, fails to persist the new one, and the next
// request retries with a token that is now spent.
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Reads the session, which renews it when it has expired; the rotated tokens
  // reach the browser through setAll above. Verifies the JWT locally against the
  // project's public key rather than calling the auth server on every request.
  await supabase.auth.getClaims();

  return response;
}
