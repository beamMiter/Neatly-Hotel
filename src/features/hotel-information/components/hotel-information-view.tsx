"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CardSkeletonOverlay } from "@/components/shared/CardSkeletonOverlay";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import type { HotelInformation } from "@/types/hotel";

type HotelInformationViewProps = {
  hotel: HotelInformation;
};

export function HotelInformationView({ hotel }: HotelInformationViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(hotel.name);
  const [description, setDescription] = useState(hotel.description);
  const [logoUrl, setLogoUrl] = useState(hotel.logoUrl);
  const [checkInTime, setCheckInTime] = useState(hotel.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(hotel.checkOutTime);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const showSkeleton = useDelayedFlag(saving);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const previewUrl = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    if (removeLogo) return null;
    return logoUrl;
  }, [logoFile, logoUrl, removeLogo]);

  useEffect(() => {
    if (!logoFile || !previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile, previewUrl]);

  function handleRemoveLogo() {
    setLogoFile(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSelectLogo(file: File | null) {
    setLogoFile(file);
    setRemoveLogo(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim() || !description.trim()) {
      setError("Hotel name and description are required.");
      return;
    }

    if (!previewUrl) {
      setError("Hotel logo is required.");
      return;
    }

    const form = new FormData();
    form.set("name", name.trim());
    form.set("description", description.trim());
    form.set("removeLogo", String(removeLogo && !logoFile));
    form.set("checkInTime", checkInTime);
    form.set("checkOutTime", checkOutTime);
    if (logoFile) {
      form.set("logo", logoFile);
    }

    setSaving(true);

    try {
      const response = await fetch("/api/hotel-information", {
        method: "PUT",
        body: form,
      });

      if (!response.ok) {
        throw new Error("Failed to update hotel information");
      }

      const payload = (await response.json()) as { data?: HotelInformation };
      if (payload.data) {
        setName(payload.data.name);
        setDescription(payload.data.description);
        setLogoUrl(payload.data.logoUrl);
        setCheckInTime(payload.data.checkInTime);
        setCheckOutTime(payload.data.checkOutTime);
        setLogoFile(null);
        setRemoveLogo(false);
      }

      setSuccess(true);
    } catch (submitError) {
      console.error("[hotel-information] Update failed:", submitError);
      setError("Could not update hotel information. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F8FA]"
    >
      <header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
        <h1 className="text-[20px] font-medium text-[#222222]">
          Hotel Information
        </h1>
        <button
          type="submit"
          disabled={saving}
          className="flex h-10 cursor-pointer items-center rounded-[4px] bg-[#C34A2C] px-5 text-[14px] font-medium text-white disabled:cursor-default disabled:opacity-60"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Updating...
            </span>
          ) : (
            "Update"
          )}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 py-6">
        <div className="relative rounded-[4px] bg-white px-10 py-8">
          <div className="flex max-w-[720px] flex-col gap-6">
            <Field id="hotel-name" label="Hotel name" required>
              <input
                id="hotel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-[4px] border border-[#D0D5DD] bg-white px-3.5 text-[14px] text-[#344054] outline-none focus:border-[#C34A2C]"
              />
            </Field>

            <Field id="hotel-description" label="Hotel description" required>
              <textarea
                id="hotel-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={8}
                className="w-full resize-y rounded-[4px] border border-[#D0D5DD] bg-white px-3.5 py-3 text-[14px] leading-6 text-[#344054] outline-none focus:border-[#C34A2C]"
              />
            </Field>

            <div className="flex gap-6">
              <Field id="hotel-checkin" label="Check-in time" required>
                <input
                  id="hotel-checkin"
                  type="time"
                  value={checkInTime}
                  onChange={(event) => setCheckInTime(event.target.value)}
                  className="h-11 w-full rounded-[4px] border border-[#D0D5DD] bg-white px-3.5 text-[14px] text-[#344054] outline-none focus:border-[#C34A2C]"
                />
              </Field>
              <Field id="hotel-checkout" label="Check-out time" required>
                <input
                  id="hotel-checkout"
                  type="time"
                  value={checkOutTime}
                  onChange={(event) => setCheckOutTime(event.target.value)}
                  className="h-11 w-full rounded-[4px] border border-[#D0D5DD] bg-white px-3.5 text-[14px] text-[#344054] outline-none focus:border-[#C34A2C]"
                />
              </Field>
            </div>

            <Field id="hotel-logo" label="Hotel logo" required>
              {previewUrl ? (
                <div className="relative w-fit">
                  <div className="flex h-[88px] w-[240px] items-center justify-center overflow-hidden rounded-[4px] border border-[#E4E7EC] bg-white px-4">
                    <Image
                      src={previewUrl}
                      alt="Hotel logo"
                      width={200}
                      height={54}
                      unoptimized
                      className="h-auto max-h-[54px] w-auto max-w-[200px] object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    aria-label="Remove hotel logo"
                    className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#E53935] text-white"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="hotel-logo"
                  className="flex h-[167px] w-[167px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[4px] bg-[#F2F4F7] text-[#C34A2C]"
                >
                  <PlusIcon className="h-6 w-6" />
                  <span className="text-[14px] font-medium">Upload logo</span>
                </label>
              )}
              <input
                ref={fileInputRef}
                id="hotel-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) =>
                  handleSelectLogo(event.target.files?.[0] ?? null)
                }
              />
            </Field>

            {error ? (
              <p className="text-[13px] text-[#C83B3B]">{error}</p>
            ) : null}
            {success ? (
              <p className="text-[13px] text-[#2F9B6A]">
                Hotel information updated.
              </p>
            ) : null}
          </div>

          <CardSkeletonOverlay show={showSkeleton} rows={4} columns={1} />
        </div>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] text-[#667085]">
        {label}
        {required ? <span className="text-[#C34A2C]"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
