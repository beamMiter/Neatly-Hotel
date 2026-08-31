"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";

const TOAST_DURATION_MS = 4000;

// Shared by every card that refetches on the client (period/date/page
// changes, CSV export) — each owns its own error state via this hook and
// renders <ErrorToast> when a fetch fails, rather than silently keeping
// stale data with no indication anything went wrong.
export function useErrorMessage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [error]);

  return [error, setError] as const;
}

export function ErrorToast({ message }: { message: string }) {
  return (
    <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg animate-[fade-slide_0.2s_ease-out]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircleIcon className="h-3.5 w-3.5" />
      </span>
      {message}
    </div>
  );
}
