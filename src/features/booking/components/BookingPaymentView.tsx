"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { StripeCardFields } from "@/features/booking/components/StripeCardFields";
import { formatDateLabel, formatThb } from "@/features/booking/format";
import { stripePromise } from "@/features/booking/stripe-client";
import type { BookingRecord } from "@/types/booking";

type PaymentMethod = "cash" | "credit_card";

type BookingPaymentViewProps = {
  bookingId: string;
  booking: BookingRecord;
  amountDue?: number;
};

export function BookingPaymentView({ bookingId, booking, amountDue = 0 }: BookingPaymentViewProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTopUp =
    amountDue > 0 && booking.paymentStatus === "pending" && booking.status !== "pending_payment";
  const isInitialPayment = booking.status === "pending_payment" && booking.paymentStatus === "pending";
  const canPay = isInitialPayment || isTopUp;
  const chargeAmount = isTopUp ? amountDue : booking.totalAmount;

  async function choosePayAtHotel() {
    setIsStartingPayment(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/pay-at-hotel`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message ?? "Unable to confirm pay at hotel");
        return;
      }
      router.push(`/booking/success?bookingId=${bookingId}`);
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsStartingPayment(false);
    }
  }

  async function startCardPayment() {
    setIsStartingPayment(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment-intent`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret) {
        setError(data.message ?? "Unable to start card payment");
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsStartingPayment(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#C14817]">
          {isTopUp ? "Outstanding balance" : "Booking confirmation"}
        </p>
        <h1 className="[font-family:var(--font-noto-serif)] text-4xl font-medium tracking-[-0.02em] text-[#2A2E3F]">
          {isTopUp ? "Pay the remaining balance" : "Review and choose payment"}
        </h1>
        <p className="text-base text-[#646D89]">
          {isTopUp
            ? "Complete this card payment to settle the updated booking total."
            : "Your room is held while you complete this booking."}
        </p>
      </div>

      <section className="rounded-lg border border-[#E4E6ED] bg-white p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[#E4E6ED] pb-4">
          <div>
            <p className="text-sm text-[#646D89]">Booking code</p>
            <p className="mt-1 text-lg font-semibold text-[#2A2E3F]">{booking.bookingCode}</p>
          </div>
          <div className="text-right">
            {isTopUp && (
              <p className="text-xs text-[#646D89]">
                Total {formatThb(booking.totalAmount)}
              </p>
            )}
            <p className="text-lg font-semibold text-[#C14817]">{formatThb(chargeAmount)}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <PaymentDetail label="Room" value={booking.roomTypeName} />
          <PaymentDetail label="Guests" value={String(booking.guests)} />
          <PaymentDetail label="Check-in" value={formatDateLabel(booking.checkIn)} />
          <PaymentDetail label="Check-out" value={formatDateLabel(booking.checkOut)} />
        </dl>
      </section>

      {!canPay ? (
        <section className="rounded-lg border border-[#E4E6ED] bg-white p-6 text-center">
          <h2 className="text-xl font-semibold text-[#2A2E3F]">This booking is already being processed</h2>
          <p className="mt-2 text-sm text-[#646D89]">Check the booking status or contact the hotel if you need help.</p>
          <Link href={`/booking/success?bookingId=${bookingId}`} className="mt-5 inline-flex rounded bg-[#C14817] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-95">
            View booking
          </Link>
        </section>
      ) : clientSecret ? (
        <section className="rounded-lg border border-[#E4E6ED] bg-white p-6">
          <Elements stripe={stripePromise}>
            <CardPaymentForm
              bookingId={bookingId}
              clientSecret={clientSecret}
              successPath={`/booking/success?bookingId=${bookingId}`}
            />
          </Elements>
        </section>
      ) : isTopUp ? (
        <section className="rounded-lg border border-[#E4E6ED] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#2A2E3F]">Pay with credit card</h2>
          <p className="mt-2 text-sm text-[#646D89]">
            The outstanding balance from your booking update is due now.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={isStartingPayment}
              onClick={() => void startCardPayment()}
              className="rounded bg-[#C14817] px-6 py-3 text-sm font-semibold text-white hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStartingPayment ? "Preparing..." : "Continue to card payment"}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[#E4E6ED] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#2A2E3F]">How would you like to pay?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("cash")}
              className={`rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-95 ${method === "cash" ? "border-[#C14817] bg-[#FFF5F0]" : "border-[#D6D9E4] hover:border-[#C14817]"}`}
            >
              <span className="block font-semibold text-[#2A2E3F]">Pay at hotel</span>
              <span className="mt-1 block text-sm text-[#646D89]">Confirm now and pay when you arrive.</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("credit_card")}
              className={`rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-95 ${method === "credit_card" ? "border-[#C14817] bg-[#FFF5F0]" : "border-[#D6D9E4] hover:border-[#C14817]"}`}
            >
              <span className="block font-semibold text-[#2A2E3F]">Credit card</span>
              <span className="mt-1 block text-sm text-[#646D89]">Pay securely online to confirm your stay.</span>
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!method || isStartingPayment}
              onClick={() => void (method === "cash" ? choosePayAtHotel() : startCardPayment())}
              className="rounded bg-[#C14817] px-6 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {isStartingPayment ? "Preparing..." : method === "cash" ? "Confirm pay at hotel" : "Continue to card payment"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function CardPaymentForm({
  bookingId,
  clientSecret,
  successPath,
}: {
  bookingId: string;
  clientSecret: string;
  successPath: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [cardOwner, setCardOwner] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmCardPayment() {
    const cardNumberElement = elements?.getElement(CardNumberElement);
    if (!stripe || !cardNumberElement) return;

    setIsSubmitting(true);
    setError(null);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: { name: cardOwner || undefined },
      },
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Payment failed. Please check your card details.");
      return;
    }
    router.push(successPath);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#2A2E3F]">Credit card</h2>
      <div className="mt-5"><StripeCardFields cardOwner={cardOwner} onCardOwnerChange={setCardOwner} /></div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void confirmCardPayment()}
          disabled={isSubmitting || !stripe || !elements}
          className="rounded bg-[#C14817] px-6 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting ? "Confirming..." : "Confirm payment"}
        </button>
      </div>
    </div>
  );
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#646D89]">{label}</dt>
      <dd className="mt-1 font-medium text-[#2A2E3F]">{value}</dd>
    </div>
  );
}
