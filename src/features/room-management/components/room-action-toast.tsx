"use client";

import { useEffect } from "react";

type RoomActionToastProps = {
  feedback:
    | { type: "success" | "error"; message: string }
    | null;
  onDismiss: () => void;
};

const DISMISS_AFTER_MS = 4_000;

export function RoomActionToast({
  feedback,
  onDismiss,
}: RoomActionToastProps) {
  useEffect(() => {
    if (!feedback) return;

    const timeoutId = window.setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  const isSuccess = feedback.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-6 bottom-6 z-50 flex max-w-sm items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${
        isSuccess ? "bg-[#247A4D]" : "bg-[#B42318]"
      }`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="cursor-pointer text-lg leading-none opacity-90 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
