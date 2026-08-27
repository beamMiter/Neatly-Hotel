"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { PhotoUpload } from "@/features/auth/components/PhotoUpload";
import {
  staffProfileUpdateSchema,
  type StaffProfileUpdateFieldErrors,
} from "@/features/profile/validations";
import type { StaffProfileForEdit } from "@/types/profile";

// Staff/admin variant of EditProfileForm — same visual shell (heading, save
// button, Basic Information / Profile Picture sections) but no dateOfBirth
// or country: those live only on the customer `profiles` row. This one
// writes to staff_members instead (see /api/profile/route.ts).
export function EditStaffProfileForm({
  email,
  initialValues,
}: {
  email: string;
  initialValues: StaffProfileForEdit;
}) {
  const router = useRouter();
  const [fields, setFields] = useState({
    firstName: initialValues.firstName,
    lastName: initialValues.lastName,
    phone: initialValues.phone,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [errors, setErrors] = useState<StaffProfileUpdateFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  function clearError(name: string) {
    setErrors((prev) =>
      prev[name as keyof StaffProfileUpdateFieldErrors]
        ? { ...prev, [name]: undefined }
        : prev,
    );
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  }

  function handlePhotoChange(nextPhoto: File | null) {
    setPhoto(nextPhoto);
    if (nextPhoto) setAvatarRemoved(false); // a fresh pick supersedes an earlier removal
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null);
    setAvatarRemoved(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const result = staffProfileUpdateSchema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: StaffProfileUpdateFieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof StaffProfileUpdateFieldErrors | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) body.append(key, value);
      if (photo) body.append("profilePicture", photo);
      if (avatarRemoved && !photo) body.append("removeAvatar", "true");

      const response = await fetch("/api/profile", { method: "PATCH", body });
      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setStatus({
          type: "error",
          message: data.message ?? "Failed to update profile. Please try again.",
        });
        return;
      }

      if (photo) {
        setAvatarUrl(URL.createObjectURL(photo));
        setPhoto(null);
      }
      setAvatarRemoved(false);
      setStatus({ type: "success", message: "Profile updated." });
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col items-end gap-[60px]"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex w-full items-center gap-6">
        <h1 className="flex-1 [font-family:var(--font-noto-serif)] font-stretch-semi-condensed text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#2F3E35] lg:text-[68px]">
          Profile
        </h1>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 shrink-0 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Update Profile"}
        </button>
      </div>

      {status && (
        <p
          role="status"
          className={`w-full rounded-md px-4 py-3 text-sm ${
            status.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {status.message}
        </p>
      )}

      <div className="flex w-full flex-col gap-10">
        <h2 className="text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#9AA1B9]">
          Basic Information
        </h2>

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

          <div className="flex flex-col gap-1.5">
            <TextField id="email" label="Email" value={email} disabled readOnly />
            <p className="text-xs text-brand-muted">
              Contact support to change the email on your account.
            </p>
          </div>
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
        </div>
      </div>

      <div className="flex w-full flex-col gap-10 border-t border-[#E4E6ED] pt-10">
        <h2 className="text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#9AA1B9]">
          Profile Picture
        </h2>
        <PhotoUpload
          id="profilePicture"
          name="profilePicture"
          file={photo}
          onChange={handlePhotoChange}
          existingUrl={avatarUrl}
          onRemoveExisting={handleRemoveAvatar}
        />
      </div>
    </form>
  );
}
