import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseRegisterFormData } from "@/features/auth/validations";

// Rejects malformed/invalid register submissions before they reach the
// route handler. The route handler still re-validates independently
// (defense in depth) rather than trusting this guard alone.
export async function proxy(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseRegisterFormData(formData);

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/register",
};
