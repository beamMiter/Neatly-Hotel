import "server-only";

type SendOtpEmailResult = { ok: true } | { ok: false; message: string };

export async function sendBookingOtpEmail(to: string, code: string): Promise<SendOtpEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Email service is not configured" };
  }

  const from = process.env.RESEND_FROM ?? "Neatly Hotel <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Neatly Hotel verification code",
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[email] Resend failed:", response.status, body);
    return { ok: false, message: "Failed to send verification email" };
  }

  return { ok: true };
}
