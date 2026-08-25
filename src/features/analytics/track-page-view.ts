import type { NextRequest, NextFetchEvent } from "next/server";
import { supabaseAdmin } from "@/server/db/supabase-admin";

const VISITOR_COOKIE = "nh_vid";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Only real page navigations count as a "visit" for the dashboard — not API
// calls, which the proxy's matcher doesn't otherwise exclude.
function isTrackablePath(pathname: string): boolean {
  return !pathname.startsWith("/api/");
}

// Fire-and-forget insert via event.waitUntil so a slow/failed write never
// adds latency to the actual page response; a dropped page view here just
// means the dashboard undercounts, not a broken request.
export function trackPageView(request: NextRequest, event: NextFetchEvent, response: Response): void {
  const pathname = request.nextUrl.pathname;
  if (!isTrackablePath(pathname)) return;

  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? crypto.randomUUID();

  if (!existingVisitorId) {
    response.headers.append(
      "Set-Cookie",
      `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=${VISITOR_COOKIE_MAX_AGE}; SameSite=Lax`,
    );
  }

  event.waitUntil(
    supabaseAdmin
      .from("page_views")
      .insert({ path: pathname, visitor_id: visitorId })
      .then(({ error }) => {
        if (error) console.error("[page_views] failed to log page view:", error);
      }),
  );
}
