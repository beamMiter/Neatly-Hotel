import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/server/db";
import { verifyEmailOtp } from "@/server/queries/email-otp.query";

const verifySchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email and 6-digit code" }, { status: 400 });
  }

  try {
    const result = await verifyEmailOtp(parsed.data.email, parsed.data.code);
    if (!result.ok) {
      const status = result.code === "TOO_MANY_ATTEMPTS" ? 429 : 400;
      return NextResponse.json({ message: result.message, code: result.code }, { status });
    }

    return NextResponse.json({
      message: "Email verified",
      verificationToken: result.verificationToken,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("[api/booking/otp/verify] POST failed:", error);
    return NextResponse.json({ message: "Failed to verify code" }, { status: 500 });
  }
}
