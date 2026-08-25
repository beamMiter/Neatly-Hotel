"use client";

import { DateOfBirthField } from "@/components/ui/DateOfBirthField";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { COUNTRIES } from "@/lib/countries";
import type { BasicInfoFieldErrors, BasicInfoInput } from "@/features/booking/validations";

export type BasicInfoFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date | undefined;
  country: string;
};

type BasicInfoStepProps = {
  fields: BasicInfoFields;
  errors: BasicInfoFieldErrors;
  onChange: <K extends keyof BasicInfoFields>(field: K, value: BasicInfoFields[K]) => void;
  onBack: () => void;
  onNext: () => void;
};

const LABEL_CLASSNAME = "[font-family:var(--font-inter)] text-base leading-[150%] text-[#2A2E3F]";
const INPUT_CLASSNAME =
  "flex h-12 w-full items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3 [font-family:var(--font-inter)] text-base leading-[150%] text-black placeholder:text-black/40 focus:border-[#C14817] focus:outline-none";
const ERROR_CLASSNAME = "text-xs text-red-600";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASSNAME}>
        {label}
      </label>
      {children}
      {error && <p className={ERROR_CLASSNAME}>{error}</p>}
    </div>
  );
}

export function BasicInfoStep({ fields, errors, onChange, onBack, onNext }: BasicInfoStepProps) {
  function handleTextChange(field: keyof BasicInfoInput) {
    return (event: React.ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value);
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded border border-[#E4E6ED] bg-white px-4 py-6 lg:gap-10 lg:p-10">
      <h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold text-[#424C6B]">
        Basic Information
      </h2>

      <div className="flex w-full flex-col gap-10">
        <div className="flex w-full flex-col gap-10 sm:flex-row">
          <Field id="firstName" label="First name" error={errors.firstName}>
            <input
              id="firstName"
              className={INPUT_CLASSNAME}
              value={fields.firstName}
              onChange={handleTextChange("firstName")}
            />
          </Field>
          <Field id="lastName" label="Last name" error={errors.lastName}>
            <input
              id="lastName"
              className={INPUT_CLASSNAME}
              value={fields.lastName}
              onChange={handleTextChange("lastName")}
            />
          </Field>
        </div>

        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            className={INPUT_CLASSNAME}
            value={fields.email}
            onChange={handleTextChange("email")}
          />
        </Field>

        <Field id="phone" label="Phone number" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            className={INPUT_CLASSNAME}
            value={fields.phone}
            onChange={handleTextChange("phone")}
          />
        </Field>

        <div className="flex flex-col gap-1">
          <DateOfBirthField
            id="dateOfBirth"
            name="dateOfBirth"
            label="Date of Birth"
            value={fields.dateOfBirth}
            onChange={(date) => onChange("dateOfBirth", date)}
            labelClassName={LABEL_CLASSNAME}
            buttonClassName={`${INPUT_CLASSNAME} text-left`}
          />
          {errors.dateOfBirth && <p className={ERROR_CLASSNAME}>{errors.dateOfBirth}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="country" className={LABEL_CLASSNAME}>
            Country
          </label>
          <div className="relative">
            <select
              id="country"
              className={`${INPUT_CLASSNAME} appearance-none pr-10 ${fields.country ? "" : "text-black/40"}`}
              value={fields.country}
              onChange={(event) => onChange("country", event.target.value)}
            >
              <option value="" disabled>
                Select country
              </option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9AA1B9]" />
          </div>
          {errors.country && <p className={ERROR_CLASSNAME}>{errors.country}</p>}
        </div>
      </div>

      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer px-2 py-1 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white hover:bg-[#A93F13]"
        >
          Next
        </button>
      </div>
    </div>
  );
}
