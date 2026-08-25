// Types for src/server/queries/email-otp.query.ts

export type SendEmailOtpResult =
  | { ok: true; expiresInSeconds: number; devCode?: string }
  | { ok: false; code: "RATE_LIMITED" | "INVALID_EMAIL" | "SEND_FAILED"; message: string };

export type VerifyEmailOtpResult =
  | { ok: true; verificationToken: string; expiresAt: string }
  | {
      ok: false;
      code: "INVALID" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "INVALID_EMAIL";
      message: string;
    };
