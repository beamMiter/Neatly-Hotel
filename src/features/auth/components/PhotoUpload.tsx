"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";

type PhotoUploadProps = {
  id: string;
  name: string;
  file: File | null;
  onChange: (file: File | null) => void;
  // Avatar already on file (editing a profile that has one) — shown until
  // the user picks a new photo, or removes it. Not used by RegisterForm
  // (nothing to show yet on a brand-new account).
  existingUrl?: string | null;
  // Only relevant alongside existingUrl: clears the saved avatar entirely
  // (distinct from onChange(null), which just cancels an unsaved new pick
  // and falls back to showing existingUrl again).
  onRemoveExisting?: () => void;
};

const DELETE_BUTTON_CLASSNAME =
  "absolute -right-1 -top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#B61515] text-white shadow-[2px_2px_12px_rgba(64,50,133,0.12)]";

export function PhotoUpload({ id, name, file, onChange, existingUrl = null, onRemoveExisting }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleCancelPick() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(event) => onChange(event.target.files?.[0] ?? null)}
    />
  );

  // A newly-picked, not-yet-saved file takes priority over whatever avatar
  // is already on file — removing it here just cancels the pick.
  if (previewUrl) {
    return (
      <div className="relative h-[167px] w-[167px]">
        <Image src={previewUrl} alt="Profile preview" fill unoptimized className="rounded object-cover" />
        <button type="button" onClick={handleCancelPick} aria-label="Cancel photo" className={DELETE_BUTTON_CLASSNAME}>
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // No newly-picked file, but an existing avatar to show — clicking the
  // photo opens the same file picker as the empty state (to replace it);
  // the delete button clears it entirely.
  if (existingUrl) {
    return (
      <div className="relative h-[167px] w-[167px]">
        <label htmlFor={id} className="group block h-full w-full cursor-pointer">
          <div className="relative h-full w-full">
            {/* unoptimized: Next 16.3.0 rejects Supabase Storage URLs at
                /_next/image even with a matching remotePattern — see
                next.config.ts. This skips that proxy entirely. */}
            <Image src={existingUrl} alt="Current profile photo" fill unoptimized className="rounded object-cover" />
            <span className="absolute inset-0 flex items-center justify-center rounded bg-black/0 text-sm font-medium text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
              Change
            </span>
          </div>
          {fileInput}
        </label>
        {onRemoveExisting && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onRemoveExisting();
            }}
            aria-label="Remove photo"
            className={DELETE_BUTTON_CLASSNAME}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="flex h-[167px] w-[167px] cursor-pointer flex-col items-center justify-center gap-1 rounded bg-[#F1F2F6] text-brand-primary transition-colors hover:bg-brand-border"
    >
      <PlusIcon className="h-5 w-5" />
      <span className="text-sm font-medium">Upload photo</span>
      {fileInput}
    </label>
  );
}
