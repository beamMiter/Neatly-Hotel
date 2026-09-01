"use client";

import { resolveAddOnQuantity } from "@/lib/addon-pricing";
import type { SpecialRequestOption } from "@/types/booking";
import { formatThb } from "@/features/booking/format";

type SpecialRequestStepProps = {
  catalog: SpecialRequestOption[];
  standardRequests: string[];
  // code -> count (see BookingWizard.tsx for what the number means per
  // billing type). A code is absent when unselected.
  specialRequestSelections: Record<string, number>;
  nights: number;
  additionalRequest: string;
  onToggleStandard: (code: string) => void;
  onSpecialCountChange: (code: string, count: number) => void;
  onAdditionalRequestChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  showActions?: boolean;
};

const HEADING_CLASSNAME = "[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#424C6B]";
const SUBHEADING_CLASSNAME = "[font-family:var(--font-inter)] text-sm leading-[150%] font-medium tracking-[-0.02em] text-[#9AA1B9]";

const AIRPORT_TRANSFER_LEGS = [
  { count: 1, label: "One way" },
  { count: 2, label: "Round trip" },
] as const;

const BREAKFAST_GUEST_OPTIONS = [1, 2] as const;

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

function CheckboxRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <Checkbox checked={checked} />
      <span
        className={`[font-family:var(--font-inter)] text-base leading-[150%] ${
          checked ? "text-[#2A2E3F]" : "text-[#646D89]"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

// A pill-style 2-option picker, used for airport-transfer legs and
// breakfast guest count — both billing types cap at 2, so this is generic
// over {count, label} rather than one-off per item.
function CountPicker({
  options,
  value,
  onSelect,
}: {
  options: readonly { count: number; label: string }[];
  value: number;
  onSelect: (count: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const active = option.count === value;
        return (
          <button
            key={option.count}
            type="button"
            onClick={() => onSelect(option.count)}
            className={`cursor-pointer rounded-full border px-3 py-1 [font-family:var(--font-inter)] text-sm transition-[border-color,background-color,color,transform] duration-150 active:scale-90 ${
              active
                ? "border-[#E76B39] bg-[#FAEDE8] font-semibold text-[#E76B39]"
                : "border-[#D6D9E4] text-[#646D89] hover:border-[#C14817]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SpecialRequestRow({
  option,
  count,
  nights,
  onCountChange,
}: {
  option: SpecialRequestOption;
  count: number | undefined;
  nights: number;
  onCountChange: (code: string, count: number) => void;
}) {
  const isSelected = count !== undefined;
  const quantity = resolveAddOnQuantity(option.billingType, count, nights);
  const lineTotal = option.price * quantity;

  const priceLabel =
    option.billingType === "per_night"
      ? `+${formatThb(option.price)}/night`
      : option.billingType === "per_leg"
        ? `+${formatThb(option.price)}/leg`
        : option.billingType === "per_day_guest"
          ? `+${formatThb(option.price)}/guest/night`
          : `+${formatThb(option.price)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onCountChange(option.code, isSelected ? 0 : 1)}
            className="sr-only"
          />
          <Checkbox checked={isSelected} />
          <span
            className={`[font-family:var(--font-inter)] text-base leading-[150%] ${
              isSelected ? "text-[#2A2E3F]" : "text-[#646D89]"
            }`}
          >
            {option.label} ({priceLabel})
          </span>
        </label>

        {isSelected && (
          <span className="shrink-0 [font-family:var(--font-inter)] text-base font-semibold text-[#2A2E3F]">
            {formatThb(lineTotal)}
          </span>
        )}
      </div>

      {isSelected && option.billingType === "per_leg" && (
        <div className="pl-9">
          <CountPicker options={AIRPORT_TRANSFER_LEGS} value={count ?? 1} onSelect={(next) => onCountChange(option.code, next)} />
        </div>
      )}

      {isSelected && option.billingType === "per_day_guest" && (
        <div className="pl-9">
          <CountPicker
            options={BREAKFAST_GUEST_OPTIONS.map((n) => ({ count: n, label: n === 1 ? "1 Guest" : "2 Guests" }))}
            value={count ?? 1}
            onSelect={(next) => onCountChange(option.code, next)}
          />
        </div>
      )}

      {isSelected && option.billingType === "per_night" && (
        <p className="pl-9 [font-family:var(--font-inter)] text-sm text-[#9AA1B9]">
          Applied for all {nights} night{nights === 1 ? "" : "s"} of the stay
        </p>
      )}
    </div>
  );
}

export function SpecialRequestStep({
  catalog,
  standardRequests,
  specialRequestSelections,
  nights,
  additionalRequest,
  onToggleStandard,
  onSpecialCountChange,
  onAdditionalRequestChange,
  onBack,
  onNext,
  showActions = true,
}: SpecialRequestStepProps) {
  const standardOptions = catalog.filter((option) => option.category === "standard");
  const specialOptions = catalog.filter((option) => option.category === "special");

  return (
    <div className="flex w-full flex-col gap-6 rounded border border-[#E4E6ED] bg-white px-4 py-6 lg:gap-10 lg:p-10">
      <div className="flex w-full flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className={HEADING_CLASSNAME}>Standard Request</h2>
            <p className={SUBHEADING_CLASSNAME}>These requests are not confirmed (Depend on the available room)</p>
          </div>
          <div className="flex flex-col gap-6">
            {standardOptions.map((option) => (
              <CheckboxRow
                key={option.code}
                checked={standardRequests.includes(option.code)}
                label={option.label}
                onChange={() => onToggleStandard(option.code)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className={HEADING_CLASSNAME}>Special Request</h2>
            <p className={SUBHEADING_CLASSNAME}>Additional charge may apply</p>
          </div>
          <div className="flex flex-col gap-6">
            {specialOptions.map((option) => (
              <SpecialRequestRow
                key={option.code}
                option={option}
                count={specialRequestSelections[option.code]}
                nights={nights}
                onCountChange={onSpecialCountChange}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="additionalRequest" className="[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]">
            Additional Request
          </label>
          <textarea
            id="additionalRequest"
            value={additionalRequest}
            onChange={(event) => onAdditionalRequestChange(event.target.value)}
            maxLength={500}
            rows={3}
            className="h-24 w-full rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 [font-family:var(--font-inter)] text-base leading-[150%] text-black focus:border-[#C14817] focus:outline-none"
          />
        </div>

        {showActions && (
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-[color,transform] duration-150 hover:text-[#C14817] active:scale-95"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#A93F13] active:scale-90"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
