"use client";

import { useEffect } from "react";

// Catches a failure in the dashboard's initial server-side data fetch
// (page.tsx's Promise.all) — e.g. the mock dataset throwing, or
// loadHotelInformation() failing to reach the database for the check-in/
// check-out subtext. `retry` re-runs the failed segment; see this Next.js
// version's error.js docs (node_modules/next/dist/docs) — `retry` replaced
// `reset` as the primary recovery prop as of 16.3.0.
export default function AnalyticsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[analytics] failed to render dashboard:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 bg-brand-primary px-8 py-4 text-white">
        <span className="text-sm font-semibold">Error: Unable to display details</span>
        <button
          type="button"
          onClick={() => retry()}
          className="text-sm font-medium underline underline-offset-2 hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
