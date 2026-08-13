"use client";

import { CalendarIcon } from "@/src/components/icons/CalendarIcon";
import { PlusIcon } from "@/src/components/icons/PlusIcon";
import { TextField } from "@/src/components/ui/TextField";
import { SelectField } from "@/src/components/ui/SelectField";
import { COUNTRIES } from "@/src/lib/countries";

export function RegisterForm() {
  return (
    <form className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-brand-muted">Basic Information</h2>

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <TextField id="firstName" name="firstName" label="First name" placeholder="Enter your first name" />
          <TextField id="lastName" name="lastName" label="Last name" placeholder="Enter your last name" />

          <TextField id="username" name="username" label="Username" placeholder="Enter your username" />
          <TextField id="email" name="email" type="email" label="Email" placeholder="Enter your email" />

          <TextField id="password" name="password" type="password" label="Password" placeholder="Enter your password" />
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Confirm your password"
          />

          <TextField id="phone" name="phone" type="tel" label="Phone number" placeholder="Enter your phone number" />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dateOfBirth" className="text-sm text-brand-body">
              Date of Birth
            </label>
            <div className="relative">
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="text"
                readOnly
                placeholder="Select your date of birth"
                className="h-11 w-full rounded-md border border-brand-border bg-white px-3.5 pr-10 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <CalendarIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
            </div>
          </div>

          <SelectField id="country" name="country" label="Country" placeholder="Select your country">
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

        <label
          htmlFor="profilePicture"
          className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-brand-surface-alt text-brand-primary transition-colors hover:bg-brand-border"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Upload photo</span>
          <input id="profilePicture" name="profilePicture" type="file" accept="image/*" className="hidden" />
        </label>
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
