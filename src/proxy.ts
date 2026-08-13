import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseRegisterPayload } from "@/features/auth/validations";

// Rejects malformed/invalid register submissions before they reach the
// route handler. The route handler still re-validates independently
// (defense in depth) rather than trusting this guard alone.
export async function proxy(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const body = await request.json().catch(() => null);
  const parsed = parseRegisterPayload(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/register",
};
