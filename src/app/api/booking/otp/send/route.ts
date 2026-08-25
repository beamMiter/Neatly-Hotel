import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl } from "@/server/db";
import { sendEmailOtp } from "@/server/queries/email-otp.query";

const sendSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ message: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 });
  }

  try {
    const result = await sendEmailOtp(parsed.data.email);
    if (!result.ok) {
      const status = result.code === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json({ message: result.message, code: result.code }, { status });
    }

    return NextResponse.json({
      message: "Verification code sent",
      expiresInSeconds: result.expiresInSeconds,
      // Only present outside production so local testing works without a mailer.
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (error) {
    console.error("[api/booking/otp/send] POST failed:", error);
    return NextResponse.json({ message: "Failed to send verification code" }, { status: 500 });
  }
}
