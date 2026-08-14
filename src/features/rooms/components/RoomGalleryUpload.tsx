"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";

type RoomGalleryUploadProps = {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
};

export function RoomGalleryUpload({ id, files, onChange }: RoomGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Preview URLs are created/revoked in event handlers, kept parallel to
  // `files` — see RoomImageUpload for why this avoids an effect cleanup.
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) {
      onChange([...files, ...selected]);
      setPreviewUrls((prev) => [...prev, ...selected.map((selectedFile) => URL.createObjectURL(selectedFile))]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove(index: number) {
    const url = previewUrls[index];
    if (url) URL.revokeObjectURL(url);
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
    setPreviewUrls((prev) => prev.filter((_, urlIndex) => urlIndex !== index));
  }

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="relative h-32 w-32">
          <Image
            src={previewUrls[index]}
            alt="Gallery preview"
            fill
            unoptimized
            className="rounded-md object-cover"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            aria-label="Remove image"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-white shadow"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

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
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAdd}
        />
      </label>
    </div>
  );
}
