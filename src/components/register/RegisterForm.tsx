"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { TextField } from "@/src/components/ui/TextField";
import { SelectField } from "@/src/components/ui/SelectField";
import { DateOfBirthField } from "@/src/components/register/DateOfBirthField";
import { PhotoUpload } from "@/src/components/register/PhotoUpload";
import { COUNTRIES } from "@/src/lib/countries";

type FormFields = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  country: string;
};

const initialFields: FormFields = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  country: "",
};

export function RegisterForm() {
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [photo, setPhoto] = useState<File | null>(null);

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-brand-muted">Basic Information</h2>

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <TextField
            id="firstName"
            name="firstName"
            label="First name"
            placeholder="Enter your first name"
            value={fields.firstName}
            onChange={handleFieldChange}
          />
          <TextField
            id="lastName"
            name="lastName"
            label="Last name"
            placeholder="Enter your last name"
            value={fields.lastName}
            onChange={handleFieldChange}
          />

          <TextField
            id="username"
            name="username"
            label="Username"
            placeholder="Enter your username"
            value={fields.username}
            onChange={handleFieldChange}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={fields.email}
            onChange={handleFieldChange}
          />

          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={fields.password}
            onChange={handleFieldChange}
          />
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Confirm your password"
            value={fields.confirmPassword}
            onChange={handleFieldChange}
          />

          <TextField
            id="phone"
            name="phone"
            type="tel"
            label="Phone number"
            placeholder="Enter your phone number"
            value={fields.phone}
            onChange={handleFieldChange}
          />

          <DateOfBirthField
            id="dateOfBirth"
            name="dateOfBirth"
            label="Date of Birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />

          <SelectField
            id="country"
            name="country"
            label="Country"
            placeholder="Select your country"
            value={fields.country}
            onChange={handleFieldChange}
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <hr className="border-t border-brand-border" />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-brand-muted">Profile Picture</h2>
        <PhotoUpload id="profilePicture" name="profilePicture" file={photo} onChange={setPhoto} />
      </section>

      <button
        type="submit"
        className="h-12 w-full rounded-md bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
      >
        Register
      </button>
    </form>
  );
}
