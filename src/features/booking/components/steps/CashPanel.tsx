"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayCashIcon } from "@/components/icons/PayCashIcon";
import { PromoCodeField } from "@/features/booking/components/PromoCodeField";
import type { SubmitBookingResult } from "@/features/booking/components/wizard-submit";

type CashPanelProps = {
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoMessage: string | null;
  promoValid: boolean;
  onSubmit: () => Promise<SubmitBookingResult>;
  onBack: () => void;
};

export function CashPanel({
  promoCode,
  onPromoCodeChange,
  promoMessage,
  promoValid,
  onSubmit,
  onBack,
}: CashPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    const result = await onSubmit();
    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.push(`/booking/success?bookingId=${result.bookingId}`);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#9AA1B9]">
        Cash
      </h2>

      <div className="flex items-center gap-4 rounded bg-[#F1F2F6] px-6 py-4">
        <PayCashIcon className="h-[50px] w-[50px] flex-none text-[#E76B39]" />
        <p className="[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]">
          Pay at the hotel with cash or cheque. No payment is required until
          check-in
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
          disabled={isSubmitting}
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
