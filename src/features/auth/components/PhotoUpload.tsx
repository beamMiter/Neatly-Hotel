"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { ALLOWED_AVATAR_IMAGE_TYPES, MAX_AVATAR_SIZE_BYTES } from "@/lib/validation-patterns";

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
  // Client-side only, for immediate feedback — an invalid pick never reaches
  // `onChange`/the parent form's state at all, so this is the only place it's
  // surfaced. The server re-checks the same rules regardless (never trust this).
  // Plain inline text for now (matches TextField's error styling) — worth
  // upgrading to a Toast/global notification later, but this is enough to
  // stop the file being silently dropped with no feedback at all.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleCancelPick() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileSelect(selected: File | null) {
    if (!selected) {
      setError(null);
      onChange(null);
      return;
    }

    if (!(ALLOWED_AVATAR_IMAGE_TYPES as readonly string[]).includes(selected.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Image must be 5MB or smaller.");
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError(null);
    onChange(selected);
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="file"
      // Matches ALLOWED_AVATAR_IMAGE_TYPES — no GIF. This only steers the OS
      // file picker; the real enforcement is handleFileSelect above (and,
      // regardless, server-side too) since accept is trivially bypassed
      // (drag-drop, "all files", a renamed extension).
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
    />
  );

  let box: React.ReactNode;

  if (previewUrl) {
    // A newly-picked, not-yet-saved file takes priority over whatever avatar
    // is already on file — removing it here just cancels the pick.
    box = (
      <div className="relative h-[167px] w-[167px]">
        <Image src={previewUrl} alt="Profile preview" fill unoptimized className="rounded object-cover" />
        <button type="button" onClick={handleCancelPick} aria-label="Cancel photo" className={DELETE_BUTTON_CLASSNAME}>
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  } else if (existingUrl) {
    // No newly-picked file, but an existing avatar to show — clicking the
    // photo opens the same file picker as the empty state (to replace it);
    // the delete button clears it entirely.
    box = (
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
  } else {
    box = (
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

  return (
    <div className="flex flex-col gap-1.5">
      {box}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
