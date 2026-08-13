"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PlusIcon } from "@/src/components/icons/PlusIcon";
import { CloseIcon } from "@/src/components/icons/CloseIcon";

type PhotoUploadProps = {
  id: string;
  name: string;
  file: File | null;
  onChange: (file: File | null) => void;
};

export function PhotoUpload({ id, name, file, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleRemove() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (previewUrl) {
    return (
      <div className="relative h-32 w-32">
        <Image
          src={previewUrl}
          alt="Profile preview"
          fill
          unoptimized
          className="rounded-md object-cover"
        />
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove photo"
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
        name={name}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}
