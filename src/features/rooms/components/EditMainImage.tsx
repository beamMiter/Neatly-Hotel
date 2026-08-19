"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { ALLOWED_IMAGE_TYPES } from "@/features/rooms/validations";

type EditMainImageProps = {
  id: string;
  previewUrl: string | null;
  isNewFile: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

// Unlike RoomImageUpload (create form, always starts empty), this needs to
// show a pre-filled existing remote URL or a freshly-picked local file, so
// the "what to display" decision is lifted to the parent instead of being
// tracked internally from a raw File.
export function EditMainImage({ id, previewUrl, isNewFile, onSelect, onRemove }: EditMainImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (previewUrl) {
    return (
      <div className="relative h-32 w-32">
        <Image src={previewUrl} alt="Room preview" fill unoptimized={isNewFile} className="rounded-md object-cover" />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove image"
          className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-brand-ink text-white shadow"
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
        onChange={handleChange}
      />
    </label>
  );
}
