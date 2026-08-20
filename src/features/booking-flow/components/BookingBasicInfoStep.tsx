"use client";

import type { ChangeEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { DateOfBirthField } from "@/features/auth/components/DateOfBirthField";
import { COUNTRIES } from "@/lib/countries";
import type { BookingBasicInfo } from "@/features/booking-flow/types";
import type { BookingBasicInfoFieldErrors } from "@/features/booking-flow/validations";

type BookingBasicInfoStepProps = {
  value: BookingBasicInfo;
  errors: BookingBasicInfoFieldErrors;
  onChange: (next: BookingBasicInfo) => void;
  onClearError: (field: keyof BookingBasicInfo) => void;
};

export function BookingBasicInfoStep({
  value,
  errors,
  onChange,
  onClearError,
}: BookingBasicInfoStepProps) {
  const dateOfBirth = value.dateOfBirth ? new Date(`${value.dateOfBirth}T00:00:00`) : undefined;

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value: fieldValue } = event.target;
    onChange({ ...value, [name]: fieldValue });
    onClearError(name as keyof BookingBasicInfo);
  }

  function handleDateChange(date: Date | undefined) {
    onChange({
      ...value,
      dateOfBirth: date ? date.toISOString().slice(0, 10) : "",
    });
    onClearError("dateOfBirth");
  }

  return (
    <div className="space-y-6">
      <h2 className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]">Basic Information</h2>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            id="firstName"
            name="firstName"
            label="First name"
            placeholder="Enter your first name"
            value={value.firstName}
            onChange={handleFieldChange}
            error={errors.firstName}
          />
          <TextField
            id="lastName"
            name="lastName"
            label="Last name"
            placeholder="Enter your last name"
            value={value.lastName}
            onChange={handleFieldChange}
            error={errors.lastName}
          />
        </div>

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={value.email}
          onChange={handleFieldChange}
          error={errors.email}
        />
        <TextField
          id="phone"
          name="phone"
          type="tel"
          label="Phone number"
          placeholder="Enter your phone number"
          value={value.phone}
          onChange={handleFieldChange}
          error={errors.phone}
        />
        <DateOfBirthField
          id="dateOfBirth"
          name="dateOfBirth"
          label="Date of Birth"
          value={dateOfBirth}
          onChange={handleDateChange}
          error={errors.dateOfBirth}
        />
        <SelectField
          id="country"
          name="country"
          label="Country"
          placeholder="Select your country"
          value={value.country}
          onChange={handleFieldChange}
          error={errors.country}
        >
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
