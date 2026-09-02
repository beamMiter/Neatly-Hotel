import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { parseRegisterFormData } from "@/features/auth/validations";
import { refreshSession } from "@/features/auth/refresh-session";
import { trackPageView } from "@/features/analytics/track-page-view";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
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

  const response = await refreshSession(request);
  trackPageView(request, event, response);
  return response;
}

export const config = {
  // Every route a signed-in user can navigate to, minus the static output that
  // carries no session — an auth cookie left unrefreshed on ordinary pages is
  // what expires the session, so this can't be narrowed to /admin.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
