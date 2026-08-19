"use client";

import { createPortal } from "react-dom";
import type { Room } from "@/types/rooms";

type RoomDeleteDialogProps = {
  room: Room | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RoomDeleteDialog({
  room,
  loading = false,
  onCancel,
  onConfirm,
}: RoomDeleteDialogProps) {
  if (!room) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-room-title"
        className="w-full max-w-[420px] rounded-[4px] bg-white p-6 shadow-[0_12px_32px_rgba(16,24,40,0.18)]"
      >
        <h2
          id="delete-room-title"
          className="text-[18px] font-medium text-[#222222]"
        >
          Delete room
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-[#667085]">
          Are you sure you want to delete room{" "}
          <span className="font-medium text-[#344054]">{room.roomNo}</span>?
          This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex h-10 cursor-pointer items-center rounded-[4px] border border-[#D0D5DD] px-4 text-[14px] font-medium text-[#344054] disabled:cursor-default disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex h-10 cursor-pointer items-center rounded-[4px] bg-[#C34A2C] px-4 text-[14px] font-medium text-white disabled:cursor-default disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
