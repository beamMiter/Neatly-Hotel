"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/icons/CloseIcon";

type GuestBookingAlertDialogProps = {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  loginHref: string;
};

const LIMITATIONS = [
  "View your past bookings",
  "Change your booking dates",
  "Request a refund, under any circumstances",
  "Receive member benefits or promotions",
];

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 flex-none items-center justify-center rounded border ${
        checked ? "border-[#F3B59C] bg-[#E76B39]" : "border-[#D6D9E4] bg-white"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path d="M5 12.5L10 17L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function ConsentRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <Checkbox checked={checked} />
      <span className="[font-family:var(--font-inter)] text-sm leading-[150%] text-[#646D89]">{children}</span>
    </label>
  );
}

export function GuestBookingAlertDialog({ open, onClose, onContinueAsGuest, loginHref }: GuestBookingAlertDialogProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPdpa, setAcceptPdpa] = useState(false);

  function resetConsent() {
    setAcceptTerms(false);
    setAcceptPdpa(false);
  }

  function handleClose() {
    resetConsent();
    onClose();
  }

  function handleContinueAsGuest() {
    resetConsent();
    onContinueAsGuest();
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canContinue = acceptTerms && acceptPdpa;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-booking-title"
        className="w-full max-w-3xl rounded-sm bg-white shadow-[2px_2px_12px_rgba(64,50,133,0.12)]"
      >
        <div className="flex items-center justify-between border-b border-[#E4E6ED] px-6 py-4">
          <h2
            id="guest-booking-title"
            className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]"
          >
            Guest Booking
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="cursor-pointer text-[#9AA1B9] transition-colors hover:text-[#2A2E3F]"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6">
          <p className="[font-family:var(--font-inter)] text-base leading-7 text-[#646D89]">
            You&apos;re about to book without signing in. If you continue as a guest, you won&apos;t be able to:
          </p>

          <ul className="flex flex-col gap-2 pl-5">
            {LIMITATIONS.map((item) => (
              <li key={item} className="list-disc [font-family:var(--font-inter)] text-sm leading-6 text-[#646D89]">
                {item}
              </li>
            ))}
          </ul>

          <p className="[font-family:var(--font-inter)] text-sm leading-6 text-[#646D89]">
            Please double-check your email and phone number — they&apos;re the only way we can reach you about this
            booking.
          </p>

          <div className="flex flex-col gap-4 border-t border-[#E4E6ED] pt-5">
            <ConsentRow checked={acceptTerms} onChange={() => setAcceptTerms((value) => !value)}>
              I accept the guest booking terms — no refunds and no date changes once confirmed.
            </ConsentRow>
            <ConsentRow checked={acceptPdpa} onChange={() => setAcceptPdpa((value) => !value)}>
              I consent to Neatly Hotel collecting and using my personal data to process this booking, in accordance
              with the Personal Data Protection Act (PDPA).
            </ConsentRow>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E4E6ED] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/booking/lookup"
            onClick={handleClose}
            className="[font-family:var(--font-inter)] text-sm font-medium text-[#646D89] underline hover:text-[#2A2E3F]"
          >
            Already booked as a guest? Find your booking
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={loginHref}
              className="flex items-center justify-center rounded-sm border border-[#E76B39] bg-white px-6 py-3 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors hover:bg-[#FFF7F3]"
            >
              Log in / Sign up
            </Link>
            <button
              type="button"
              onClick={handleContinueAsGuest}
              disabled={!canContinue}
              className="cursor-pointer rounded-sm bg-[#C14817] px-6 py-3 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#C14817]"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
