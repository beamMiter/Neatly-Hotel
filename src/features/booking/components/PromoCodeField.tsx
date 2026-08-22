const LABEL_CLASSNAME = "[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]";
const ERROR_COLOR = "#B42318";

type PromoCodeFieldProps = {
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoMessage: string | null;
  promoValid: boolean;
};

export function PromoCodeField({ promoCode, onPromoCodeChange, promoMessage, promoValid }: PromoCodeFieldProps) {
  const hasError = promoMessage !== null && !promoValid;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="promoCode" className={LABEL_CLASSNAME}>
        Promotion Code
      </label>
      <div className="relative">
        <input
          id="promoCode"
          className={`flex h-12 w-full items-center gap-2 rounded border bg-white py-3 pr-10 pl-3 uppercase [font-family:var(--font-inter)] text-base leading-[150%] text-black placeholder:text-black/40 focus:outline-none ${
            hasError ? "border-[#B42318] focus:border-[#B42318]" : "border-[#D6D9E4] focus:border-[#C14817]"
          }`}
          value={promoCode}
          onChange={(event) => onPromoCodeChange(event.target.value)}
        />
        {hasError && (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2"
          >
            <circle cx="10" cy="10" r="10" fill={ERROR_COLOR} />
            <rect x="9" y="5" width="2" height="7" rx="1" fill="white" />
            <rect x="9" y="14" width="2" height="2" rx="1" fill="white" />
          </svg>
        )}
      </div>
      {promoMessage && (
        <p className="text-sm" style={{ color: promoValid ? "#16A34A" : ERROR_COLOR }}>
          {promoMessage}
        </p>
      )}
    </div>
  );
}
