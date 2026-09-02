"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/features/booking/stripe-client";
import { PromptPayIcon } from "@/components/icons/PromptPayIcon";
import { PromoCodeField } from "@/features/booking/components/PromoCodeField";
import type { SubmitBookingResult } from "@/features/booking/components/wizard-submit";

type PromptPayPanelProps = {
  guestEmail: string;
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoMessage: string | null;
  promoValid: boolean;
  onSubmit: () => Promise<SubmitBookingResult>;
  onBack: () => void;
};

export function PromptPayPanel(props: PromptPayPanelProps) {
  return (
    <Elements stripe={stripePromise}>
      <PromptPayForm {...props} />
    </Elements>
  );
}

function PromptPayForm({
  guestEmail,
  promoCode,
  onPromoCodeChange,
  promoMessage,
  promoValid,
  onSubmit,
  onBack,
}: PromptPayPanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError(null);

    // Same shape as the credit-card panel: booking + PaymentIntent are
    // created first, no payment data travels through this call.
    const result = await onSubmit();
    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }
    if (!result.clientSecret) {
      setError("Failed to start payment. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // PromptPay has no fields to collect — Stripe requires a billing email
    // to attach the QR/receipt to. `handleActions` defaults to true, so
    // Stripe.js opens its own hosted overlay showing the QR code and waits
    // there; it resolves once the guest completes it, dismisses it, or it
    // expires (unlike a card, the guest confirms from their banking app, not
    // this page — no in-page QR rendering needed on our side).
    const { error: confirmError, paymentIntent } = await stripe.confirmPromptPayPayment(result.clientSecret, {
      payment_method: { billing_details: { email: guestEmail } },
    });

    setIsSubmitting(false);

    // Unlike a card decline, an expired/abandoned PromptPay QR does NOT
    // reliably come back as `confirmError` — Stripe just resolves the
    // overlay with a paymentIntent that never reached "succeeded" (verified:
    // clicking Stripe's "EXPIRE TEST PAYMENT" in test mode returns no error
    // here at all). Checking status explicitly is what catches that case —
    // relying on confirmError alone silently sent expired PromptPay attempts
    // to the success page. The webhook is still the real source of truth for
    // the booking's DB row either way (see BookingSuccessView's own guard).
    if (confirmError || paymentIntent?.status !== "succeeded") {
      router.push(`/booking/failed?bookingId=${result.bookingId}`);
      return;
    }

    router.push(`/booking/success?bookingId=${result.bookingId}`);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#9AA1B9]">
        PromptPay
      </h2>

      <div className="flex items-center gap-4 rounded bg-[#F1F2F6] px-6 py-4">
        <PromptPayIcon className="h-[50px] w-[50px] flex-none text-[#E76B39]" />
        <p className="[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]">
          Scan a QR code with your banking app to pay instantly — no card
          needed. Confirm your booking to get the QR code.
        </p>
      </div>

      <div className="flex w-full flex-col gap-10 border-t border-[#E4E6ED] pt-6">
        <PromoCodeField
          promoCode={promoCode}
          onPromoCodeChange={onPromoCodeChange}
          promoMessage={promoMessage}
          promoValid={promoValid}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex h-12 w-full items-center justify-between gap-10">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-[#E76B39] transition-[color,transform] duration-150 hover:text-[#C14817] active:scale-95"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || !stripe || !elements}
          className="flex h-12 w-[194px] items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-90 disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting ? "Confirming..." : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}
