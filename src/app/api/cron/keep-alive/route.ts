import { NextResponse } from "next/server";
import { pingDatabase } from "@/server/queries/health.query";

// Vercel Cron calls this on the schedule in vercel.json, sending
// `Authorization: Bearer ${CRON_SECRET}` automatically — that's also what
// stops anyone else from hitting this route and spending Supabase quota.
// A manual run (curl, Vercel dashboard "Run now") needs that same header.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await pingDatabase();
  if (!result.ok) {
    console.error("[api/cron/keep-alive] ping failed:", result.error);
    return NextResponse.json({ ok: false, message: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
