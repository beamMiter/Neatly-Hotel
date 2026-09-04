import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/server/db";
import { isMailerConfigured, sendBookingOtpEmail } from "@/server/services/email";
import type { SendEmailOtpResult, VerifyEmailOtpResult } from "@/types/email-otp";

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const VERIFICATION_TTL_SECONDS = 30 * 60;

function otpSecret(): string {
  return process.env.EMAIL_OTP_SECRET || process.env.SUPABASE_SECRET_KEY || "dev-email-otp-secret";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashOtpCode(email: string, code: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${email}:${code}`).digest("hex");
}

function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, "0");
}

export function createEmailVerificationToken(email: string): { token: string; expiresAt: string } {
  const normalized = normalizeEmail(email);
  const expiresAtMs = Date.now() + VERIFICATION_TTL_SECONDS * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const payload = `${normalized}|${expiresAtMs}`;
  const sig = crypto.createHmac("sha256", otpSecret()).update(payload).digest("base64url");
  return { token: `${payload}|${sig}`, expiresAt };
}

export function assertEmailVerificationToken(email: string, token: string): boolean {
  const normalized = normalizeEmail(email);
  const parts = token.split("|");
  if (parts.length !== 3) return false;
  const [tokenEmail, expiresAtRaw, sig] = parts;
  if (tokenEmail !== normalized) return false;
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) return false;
  const expected = crypto
    .createHmac("sha256", otpSecret())
    .update(`${tokenEmail}|${expiresAtMs}`)
    .digest("base64url");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function sendEmailOtp(rawEmail: string): Promise<SendEmailOtpResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Enter a valid email address" };
  }

  const recent = await prisma.$queryRaw<{ created_at: Date }[]>`
    select created_at
    from email_otps
    where lower(trim(email)) = ${email}
    order by created_at desc
    limit 1
  `;

  if (recent[0]) {
    const ageMs = Date.now() - new Date(recent[0].created_at).getTime();
    if (ageMs < RESEND_COOLDOWN_SECONDS * 1000) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another code`,
      };
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(email, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.$executeRaw`
    insert into email_otps (email, code_hash, expires_at)
    values (${email}, ${codeHash}, ${expiresAt})
  `;

  if (isMailerConfigured()) {
    const sent = await sendBookingOtpEmail(email, code);
    if (!sent.ok) {
      return { ok: false, code: "SEND_FAILED", message: sent.message };
    }
    return { ok: true, expiresInSeconds: OTP_TTL_SECONDS };
  }

  // No mailer configured — dev fallback only.
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email-otp] code for ${email}: ${code}`);
    return { ok: true, expiresInSeconds: OTP_TTL_SECONDS, devCode: code };
  }

  return {
    ok: false,
    code: "SEND_FAILED",
    message: "Email service is not configured",
  };
}

export async function verifyEmailOtp(rawEmail: string, rawCode: string): Promise<VerifyEmailOtpResult> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();

  if (!isValidEmail(email)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Enter a valid email address" };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, code: "INVALID", message: "Invalid or expired code" };
  }

  // Wrap in a transaction so FOR UPDATE + attempt increments stay consistent
  // under concurrent verify requests for the same email.
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string; code_hash: string; expires_at: Date; attempts: number }[]
    >`
      select id, code_hash, expires_at, attempts
      from email_otps
      where lower(trim(email)) = ${email}
        and consumed_at is null
      order by created_at desc
      limit 1
      for update
    `;

    const row = locked[0];
    if (!row) {
      return { ok: false, code: "INVALID", message: "Invalid or expired code" };
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return { ok: false, code: "EXPIRED", message: "Invalid or expired code" };
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      return {
        ok: false,
        code: "TOO_MANY_ATTEMPTS",
        message: "Too many attempts. Request a new code",
      };
    }

    const expectedHash = hashOtpCode(email, code);
    let matches = false;
    try {
      matches = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(expectedHash));
    } catch {
      matches = false;
    }

    if (!matches) {
      await tx.$executeRaw`
        update email_otps
        set attempts = attempts + 1
        where id = ${row.id}::uuid
      `;
      return { ok: false, code: "INVALID", message: "Invalid or expired code" };
    }

    await tx.$executeRaw`
      update email_otps
      set consumed_at = now()
      where id = ${row.id}::uuid
    `;

    const verified = createEmailVerificationToken(email);
    return {
      ok: true,
      verificationToken: verified.token,
      expiresAt: verified.expiresAt,
    };
  });
}
