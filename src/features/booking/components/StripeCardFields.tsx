"use client";

import type { StripeCardNumberElementOptions } from "@stripe/stripe-js";
import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";

// Split Card Elements (not the unified Payment Element): each one mounts as
// its own iframe field styled to sit inside our own bordered box, so it's
// visually indistinguishable from a plain <input> and can be laid out in
// whatever order the design needs (Card Number, then our own Card Owner
// input, then Expiry/CVC) — the unified Payment Element bundles those three
// into one uninterruptible block and can't be reordered like this. Raw
// digits still never touch our state; Stripe's iframe owns them exactly as
// before. Shared between the new-booking card panel and the failed-payment
// retry form so both stay visually and behaviorally identical.
const ELEMENT_STYLE: StripeCardNumberElementOptions["style"] = {
  base: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "16px",
    lineHeight: "24px",
    color: "#000000",
    "::placeholder": { color: "rgba(0,0,0,0.4)" },
  },
  invalid: { color: "#DC2626" },
};

const INPUT_CLASSNAME =
  "flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 [font-family:var(--font-inter)] text-base leading-[150%] text-black placeholder:text-black/40 focus:border-[#C14817] focus:outline-none";
const ELEMENT_BOX_CLASSNAME =
  "flex h-12 w-full items-center rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 has-[.StripeElement--focus]:border-[#C14817]";
const LABEL_CLASSNAME = "[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]";

type StripeCardFieldsProps = {
  cardOwner: string;
  onCardOwnerChange: (value: string) => void;
};

export function StripeCardFields({ cardOwner, onCardOwnerChange }: StripeCardFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="cardNumber" className={LABEL_CLASSNAME}>
          Card Number
        </label>
        <div id="cardNumber" className={ELEMENT_BOX_CLASSNAME}>
          <CardNumberElement
            options={{ style: ELEMENT_STYLE, placeholder: "1234 1234 1234 1234", showIcon: true }}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cardOwner" className={LABEL_CLASSNAME}>
          Card Owner
        </label>
        <input
          id="cardOwner"
          className={INPUT_CLASSNAME}
          value={cardOwner}
          onChange={(event) => onCardOwnerChange(event.target.value)}
        />
      </div>

      <div className="flex w-full gap-10">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="cardExpiry" className={LABEL_CLASSNAME}>
            Expiry Date
          </label>
          <div id="cardExpiry" className={ELEMENT_BOX_CLASSNAME}>
            <CardExpiryElement options={{ style: ELEMENT_STYLE, placeholder: "MM / YY" }} className="w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="cardCvc" className={LABEL_CLASSNAME}>
            CVC/CVV
          </label>
          <div id="cardCvc" className={ELEMENT_BOX_CLASSNAME}>
            <CardCvcElement options={{ style: ELEMENT_STYLE, placeholder: "CVC" }} className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
}
