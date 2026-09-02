"use client";

import { CreditCardIcon } from "@/components/icons/CreditCardIcon";
import { CashIcon } from "@/components/icons/CashIcon";
import { CreditCardPanel } from "@/features/booking/components/steps/CreditCardPanel";
import { CashPanel } from "@/features/booking/components/steps/CashPanel";
import type { SubmitBookingResult } from "@/features/booking/components/wizard-submit";

type PaymentMethod = "credit_card" | "cash";

type PaymentMethodStepProps = {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoMessage: string | null;
  promoValid: boolean;
  onSubmit: () => Promise<SubmitBookingResult>;
  onBack: () => void;
};

function PaymentOptionCard({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const color = selected ? "#E76B39" : "#9AA1B9";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-15 flex-1 cursor-pointer items-center justify-center gap-2 rounded bg-white shadow-[4px_4px_16px_rgba(0,0,0,0.08)] transition-[border-color,transform] duration-150 active:scale-95 lg:h-20 ${
        selected ? "border border-[#E76B39]" : "border border-[#E4E6ED]"
      }`}
    >
      {icon}
      <span
        className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </span>
    </button>
  );
}

export function PaymentMethodStep({
  paymentMethod,
  onPaymentMethodChange,
  promoCode,
  onPromoCodeChange,
  promoMessage,
  promoValid,
  onSubmit,
  onBack,
}: PaymentMethodStepProps) {
  return (
    <div className="flex w-full flex-col gap-6 rounded border border-[#E4E6ED] bg-white px-4 py-6 lg:gap-10 lg:p-10">
      <div className="flex w-full gap-2 lg:gap-4">
        <PaymentOptionCard
          selected={paymentMethod === "credit_card"}
          icon={<CreditCardIcon className="h-8 w-8" style={{ color: paymentMethod === "credit_card" ? "#E76B39" : "#9AA1B9" }} />}
          label="Credit Card"
          onClick={() => onPaymentMethodChange("credit_card")}
        />
        <PaymentOptionCard
          selected={paymentMethod === "cash"}
          icon={<CashIcon className="h-8 w-8" style={{ color: paymentMethod === "cash" ? "#E76B39" : "#9AA1B9" }} />}
          label="Cash"
          onClick={() => onPaymentMethodChange("cash")}
        />
      </div>

      {paymentMethod === "credit_card" ? (
        <CreditCardPanel
          promoCode={promoCode}
          onPromoCodeChange={onPromoCodeChange}
          promoMessage={promoMessage}
          promoValid={promoValid}
          onSubmit={onSubmit}
          onBack={onBack}
        />
      ) : (
        <CashPanel
          promoCode={promoCode}
          onPromoCodeChange={onPromoCodeChange}
          promoMessage={promoMessage}
          promoValid={promoValid}
          onSubmit={onSubmit}
          onBack={onBack}
        />
      )}
    </div>
  );
}
