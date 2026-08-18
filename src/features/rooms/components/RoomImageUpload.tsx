"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { ALLOWED_IMAGE_TYPES } from "@/features/rooms/validations";

type RoomImageUploadProps = {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
};

export function RoomImageUpload({ id, file, onChange }: RoomImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Preview URL is created/revoked in event handlers (not render or an
  // effect cleanup) — React Strict Mode's dev-only double-invoke of effect
  // cleanup would otherwise revoke the URL before the <img> ever loads it.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file && previewUrl) {
    return (
      <div className="relative h-32 w-32">
        <Image src={previewUrl} alt="Room preview" fill unoptimized className="rounded-md object-cover" />
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove image"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-white shadow"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-brand-surface-alt text-brand-primary transition-colors hover:bg-brand-border"
    >
      <PlusIcon className="h-5 w-5" />
      <span className="text-sm font-medium">Upload photo</span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={handleSelect}
      />
    </label>
  );
}
