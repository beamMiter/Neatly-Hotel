"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { TextField } from "@/src/components/ui/TextField";
import { SelectField } from "@/src/components/ui/SelectField";
import { DateOfBirthField } from "@/src/components/register/DateOfBirthField";
import { PhotoUpload } from "@/src/components/register/PhotoUpload";
import { COUNTRIES } from "@/src/lib/countries";
import {
  registerSchema,
  getPasswordMismatchError,
  type RegisterFieldErrors,
} from "@/src/lib/validations/register";

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
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function clearError(name: string) {
    setErrors((prev) => (prev[name as keyof RegisterFieldErrors] ? { ...prev, [name]: undefined } : prev));
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  }

  function handleDateChange(date: Date | undefined) {
    setDateOfBirth(date);
    clearError("dateOfBirth");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus(null);

    const result = registerSchema.safeParse({ ...fields, dateOfBirth });
    const fieldErrors: RegisterFieldErrors = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegisterFieldErrors | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }

    const mismatchError = getPasswordMismatchError(fields.password, fields.confirmPassword);
    if (mismatchError) fieldErrors.confirmPassword = mismatchError;

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, dateOfBirth: dateOfBirth?.toISOString() }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormStatus({ type: "error", message: data.message ?? "Registration failed. Please try again." });
        return;
      }

      setFormStatus({ type: "success", message: "Account created! You can now log in." });
      setFields(initialFields);
      setDateOfBirth(undefined);
      setPhoto(null);
    } catch {
      setFormStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-8" noValidate onSubmit={handleSubmit}>
      {formStatus && (
        <p
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            formStatus.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {formStatus.message}
        </p>
      )}

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
            error={errors.firstName}
          />
          <TextField
            id="lastName"
            name="lastName"
            label="Last name"
            placeholder="Enter your last name"
            value={fields.lastName}
            onChange={handleFieldChange}
            error={errors.lastName}
          />

          <TextField
            id="username"
            name="username"
            label="Username"
            placeholder="Enter your username"
            value={fields.username}
            onChange={handleFieldChange}
            error={errors.username}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={fields.email}
            onChange={handleFieldChange}
            error={errors.email}
          />

          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={fields.password}
            onChange={handleFieldChange}
            error={errors.password}
          />
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Confirm your password"
            value={fields.confirmPassword}
            onChange={handleFieldChange}
            error={errors.confirmPassword}
          />

          <TextField
            id="phone"
            name="phone"
            type="tel"
            label="Phone number"
            placeholder="Enter your phone number"
            value={fields.phone}
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
            value={fields.country}
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
      </section>

      <hr className="border-t border-brand-border" />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-brand-muted">Profile Picture</h2>
        <PhotoUpload id="profilePicture" name="profilePicture" file={photo} onChange={setPhoto} />
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-md bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
