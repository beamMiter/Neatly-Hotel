"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/icons/CloseIcon";
import type { RoomFormFailure } from "@/lib/rooms/form-failure";

type RoomFormErrorDialogProps = {
  failure: RoomFormFailure | null;
  onClose: () => void;
};

export function RoomFormErrorDialog({ failure, onClose }: RoomFormErrorDialogProps) {
  useEffect(() => {
    if (!failure) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [failure, onClose]);

  if (!failure) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="room-form-error-title"
        aria-describedby="room-form-error-reason"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="room-form-error-title" className="text-base font-semibold text-red-700">
            {failure.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-brand-muted transition-colors hover:text-brand-body"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p id="room-form-error-reason" className="mt-3 text-sm text-brand-body">
          {failure.reason}
        </p>
        <p className="mt-2 text-sm text-brand-muted">{failure.hint}</p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
