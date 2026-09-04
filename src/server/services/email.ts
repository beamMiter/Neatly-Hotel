import "server-only";
import nodemailer from "nodemailer";

type SendEmailResult = { ok: true } | { ok: false; message: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  // Gmail app passwords are often pasted with spaces — strip them.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isFinite(port) || port <= 0) return null;

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
  };
}

function resendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

export function isMailerConfigured(): boolean {
  return smtpConfig() !== null || Boolean(resendApiKey());
}

function mailFrom(smtpUser?: string): string {
  const smtpFrom = process.env.SMTP_FROM?.trim();
  if (smtpFrom) return smtpFrom;
  if (smtpUser) return `Neatly Hotel <${smtpUser}>`;
  return process.env.RESEND_FROM ?? "Neatly Hotel <onboarding@resend.dev>";
}

export function bookingSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

export function guestBookingLookupUrl(bookingCode: string, email: string): string {
  const origin = bookingSiteOrigin();
  const params = new URLSearchParams({
    code: bookingCode,
    email,
  });
  const path = `/booking/lookup?${params.toString()}`;
  return origin ? `${origin}${path}` : path;
}

async function sendSmtpEmail(params: {
  to: string;
  subject: string;
  html: string;
  failureMessage: string;
}): Promise<SendEmailResult> {
  const smtp = smtpConfig();
  if (!smtp) {
    return { ok: false, message: "Email service is not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    await transporter.sendMail({
      from: mailFrom(smtp.user),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return { ok: true };
  } catch (error) {
    console.error("[email] SMTP failed:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : params.failureMessage,
    };
  }
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  failureMessage: string;
}): Promise<SendEmailResult> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    return { ok: false, message: "Email service is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[email] Resend failed:", response.status, body);
    return {
      ok: false,
      message: body.trim() || params.failureMessage,
    };
  }

  return { ok: true };
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  failureMessage: string;
}): Promise<SendEmailResult> {
  if (smtpConfig()) {
    return sendSmtpEmail(params);
  }
  return sendResendEmail(params);
}

export async function sendBookingOtpEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Your Neatly Hotel verification code",
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    failureMessage: "Failed to send verification email",
  });
}

export type BookingConfirmationEmailInput = {
  to: string;
  guestFirstName: string;
  bookingCode: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
};

export async function sendGuestBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): Promise<SendEmailResult> {
  const lookupUrl = guestBookingLookupUrl(input.bookingCode, input.to);
  const totalLabel = input.totalAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const name = input.guestFirstName.trim() || "Guest";

  return sendEmail({
    to: input.to,
    subject: `Booking confirmed — ${input.bookingCode}`,
    html: `
      <p>Hi ${name},</p>
      <p>Your Neatly Hotel booking is confirmed.</p>
      <p><strong>Booking code:</strong> ${input.bookingCode}</p>
      <p><strong>Check-in:</strong> ${input.checkIn}<br/>
         <strong>Check-out:</strong> ${input.checkOut}<br/>
         <strong>Total:</strong> THB ${totalLabel}</p>
      <p>Save this booking code. Use the link below with your email to view your booking (guest booking history):</p>
      <p><a href="${lookupUrl}">View your booking</a></p>
      <p>Or open:<br/>${lookupUrl}</p>
      <p>Thank you for staying with Neatly Hotel.</p>
    `,
    failureMessage: "Failed to send booking confirmation email",
  });
}
