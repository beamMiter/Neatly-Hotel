"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/features/booking/stripe-client";
import { StripeCardFields } from "@/features/booking/components/StripeCardFields";
import type { BookingRecord } from "@/types/booking";

type BookingFailedViewProps = {
  bookingId: string;
  booking: BookingRecord;
};

// Retry creates a NEW PaymentIntent (via POST /api/bookings/[id]/payment-intent)
// rather than reusing the failed one — Stripe PaymentIntents that reached a
// terminal failure state can't simply be re-confirmed.
export function BookingFailedView({ bookingId, booking }: BookingFailedViewProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingRetry, setIsStartingRetry] = useState(false);

  async function handleRetry() {
    setIsStartingRetry(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment-intent`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "This booking can no longer be retried");
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsStartingRetry(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[738px] flex-col gap-10 px-4 py-20">
      <div className="flex w-full flex-col items-center gap-6 rounded bg-[#FAEDE8] px-6 pt-16 pb-[88px]">
        <Image src="/icons/icon/icon-error.svg" alt="" width={64} height={64} />

        <div className="flex flex-col items-center gap-3">
          <h1 className="[font-family:var(--font-noto-serif)] text-center text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#C14817]">
            Payment failed
          </h1>
          <p className="[font-family:var(--font-inter)] text-center text-sm leading-[150%] font-medium tracking-[-0.02em] text-[#E76B39]">
            There seems to be an issue with your card. Please check your card details and try again later, or use a
            different payment method.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!clientSecret && (
          <div className="flex items-center gap-10">
            <Link
              href="/"
              className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-[#E76B39]"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isStartingRetry}
              className="flex h-12 w-[250px] items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-white hover:bg-[#A93F13] disabled:opacity-60"
            >
              {isStartingRetry ? "Starting..." : "Try Again"}
            </button>
          </div>
        )}
      </div>

      {clientSecret && (
        <div className="flex w-full flex-col gap-10 rounded border border-[#E4E6ED] bg-white p-10">
          <Elements stripe={stripePromise}>
            <RetryPaymentForm bookingId={bookingId} bookingCode={booking.bookingCode} clientSecret={clientSecret} />
          </Elements>
        </div>
      )}
    </div>
  );
}

function RetryPaymentForm({
  bookingId,
  bookingCode,
  clientSecret,
}: {
  bookingId: string;
  bookingCode: string;
  clientSecret: string;
}) {
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

    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: { name: cardOwner || undefined },
      },
    });

    setIsSubmitting(false);

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed again — please check your card details");
      return;
    }

    router.push(`/booking/success?bookingId=${bookingId}`);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#424C6B]">
        Retry payment for {bookingCode}
      </h2>

      <StripeCardFields cardOwner={cardOwner} onCardOwnerChange={setCardOwner} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex h-12 w-full items-center justify-end">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || !stripe || !elements}
          className="flex h-12 w-[194px] items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base leading-none font-semibold text-white hover:bg-[#A93F13] disabled:opacity-60"
        >
          {isSubmitting ? "Confirming..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}
