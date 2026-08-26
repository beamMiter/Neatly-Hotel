"use client";

import { useEffect, useRef, useState } from "react";
import { useInterval } from "@/lib/useInterval";

const LABEL_CLASSNAME = "[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]";
const INPUT_CLASSNAME =
  "flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 [font-family:var(--font-inter)] text-base leading-[150%] text-black placeholder:text-black/40 focus:border-[#C14817] focus:outline-none";
const ERROR_CLASSNAME = "text-xs text-red-600";
const SUCCESS_CLASSNAME = "text-sm text-[#16A34A]";

type EmailOtpVerificationProps = {
  email: string;
  emailValid: boolean;
  verified: boolean;
  error?: string;
  onVerified: (token: string, expiresAt: string) => void;
  onClearVerification: () => void;
};

export function EmailOtpVerification({
  email,
  emailValid,
  verified,
  error,
  onVerified,
  onClearVerification,
}: EmailOtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("");
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const previousEmailRef = useRef(email);

  useInterval(
    () => setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0)),
    cooldownSeconds > 0 ? 1000 : null,
  );

  useEffect(() => {
    if (previousEmailRef.current === email) return;
    previousEmailRef.current = email;
    setOtpCode("");
    setSendMessage(null);
    setVerifyError(null);
    setCodeSent(false);
    setCooldownSeconds(0);
    onClearVerification();
  }, [email, onClearVerification]);

  async function handleSendCode() {
    if (!emailValid || sending || cooldownSeconds > 0) return;

    setSending(true);
    setSendMessage(null);
    setVerifyError(null);

    try {
      const response = await fetch("/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSendMessage(data.message ?? "Failed to send verification code");
        if (response.status === 429) setCooldownSeconds(60);
        return;
      }

      setCodeSent(true);
      setCooldownSeconds(60);
      const devHint = data.devCode ? ` (dev: ${data.devCode})` : "";
      setSendMessage(`Verification code sent${devHint}`);
    } catch {
      setSendMessage("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (!emailValid || verifying || otpCode.length !== 6) return;

    setVerifying(true);
    setVerifyError(null);

    try {
      const response = await fetch("/api/booking/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setVerifyError(data.message ?? "Invalid or expired code");
        return;
      }

      onVerified(data.verificationToken, data.expiresAt);
      setVerifyError(null);
      setSendMessage(null);
    } catch {
      setVerifyError("Network error — please try again");
    } finally {
      setVerifying(false);
    }
  }

  if (verified) {
    return (
      <div className="flex flex-col gap-1">
        <p className={LABEL_CLASSNAME}>Email verification</p>
        <p className={SUCCESS_CLASSNAME}>Email verified</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-[#E4E6ED] bg-[#F7F7FB] p-4">
      <div className="flex flex-col gap-1">
        <p className={LABEL_CLASSNAME}>Email verification</p>
        <p className="text-sm text-[#424C6B]">
          We will send a 6-digit code to confirm this email before you book.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSendCode}
          disabled={!emailValid || sending || cooldownSeconds > 0}
          className="cursor-pointer rounded border border-[#C14817] px-4 py-2 [font-family:var(--font-open-sans)] text-sm font-semibold text-[#C14817] hover:bg-[#FFF5F0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : codeSent ? "Resend code" : "Send code"}
        </button>
      </div>

      {codeSent && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="otpCode" className={LABEL_CLASSNAME}>
              Verification code
            </label>
            <input
              id="otpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={INPUT_CLASSNAME}
              placeholder="6-digit code"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || otpCode.length !== 6}
            className="flex h-12 items-center justify-center rounded bg-[#C14817] px-6 [font-family:var(--font-open-sans)] text-sm font-semibold text-white hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </div>
      )}

      {sendMessage && !verifyError && !error && (
        <p className={sendMessage.includes("dev:") ? "text-sm text-[#424C6B]" : SUCCESS_CLASSNAME}>{sendMessage}</p>
      )}
      {(verifyError || error) && <p className={ERROR_CLASSNAME}>{verifyError ?? error}</p>}
    </div>
  );
}
