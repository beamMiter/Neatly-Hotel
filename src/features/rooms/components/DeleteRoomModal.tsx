"use client";

import { CloseIcon } from "@/components/icons/CloseIcon";

type DeleteRoomModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
};

export function DeleteRoomModal({ open, onClose, onConfirm, isDeleting }: DeleteRoomModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-body">Delete Room</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-brand-muted transition-colors hover:text-brand-body"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-brand-muted">Are you sure you want to delete this room?</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="cursor-pointer rounded-md border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-surface-alt disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </span>
            ) : (
              "Yes, I want to delete"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            No, I don&apos;t
          </button>
        </div>
      </div>
    </div>
  );
}
