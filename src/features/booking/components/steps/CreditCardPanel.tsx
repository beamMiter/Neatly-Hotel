"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/features/booking/stripe-client";
import { StripeCardFields } from "@/features/booking/components/StripeCardFields";
import { PromoCodeField } from "@/features/booking/components/PromoCodeField";
import type { SubmitBookingResult } from "@/features/booking/components/wizard-submit";

type CreditCardPanelProps = {
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoMessage: string | null;
  promoValid: boolean;
  onSubmit: () => Promise<SubmitBookingResult>;
  onBack: () => void;
};

export function CreditCardPanel({
  promoCode,
  onPromoCodeChange,
  promoMessage,
  promoValid,
  onSubmit,
  onBack,
}: CreditCardPanelProps) {
  return (
    <Elements stripe={stripePromise}>
      <CreditCardForm
        promoCode={promoCode}
        onPromoCodeChange={onPromoCodeChange}
        promoMessage={promoMessage}
        promoValid={promoValid}
        onSubmit={onSubmit}
        onBack={onBack}
      />
    </Elements>
  );
}

function CreditCardForm({ promoCode, onPromoCodeChange, promoMessage, promoValid, onSubmit, onBack }: CreditCardPanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [cardOwner, setCardOwner] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const cardNumberElement = elements?.getElement(CardNumberElement);
    if (!stripe || !elements || !cardNumberElement) return;
    setIsSubmitting(true);
    setError(null);

    // Creates the booking + a real PaymentIntent for the server-computed
    // total. Card fields never travel through this call — only selections.
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

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: { name: cardOwner || undefined },
      },
    });

    setIsSubmitting(false);

    // The client-side result here is advisory only — the success page
    // re-fetches the booking's real status from the server, since the
    // Stripe webhook (not this call) is the source of truth for whether
    // the booking is actually marked paid. See plan §9.
    if (confirmError) {
      router.push(`/booking/failed?bookingId=${result.bookingId}`);
      return;
    }

    void paymentIntent;
    router.push(`/booking/success?bookingId=${result.bookingId}`);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-10">
        <h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#424C6B]">
          Credit Card
        </h2>

        <StripeCardFields cardOwner={cardOwner} onCardOwnerChange={setCardOwner} />
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
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Confirming...
            </span>
          ) : (
            "Confirm Booking"
          )}
        </button>
      </div>
    </div>
  );
}
