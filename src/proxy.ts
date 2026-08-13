import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseRegisterFormData } from "@/features/auth/validations";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/register") {
    if (request.method !== "POST") return NextResponse.next();

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const parsed = parseRegisterFormData(formData);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    return NextResponse.next();
  }

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

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/api/register", "/admin/:path*"],
};
