"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons/CheckIcon";

const TOAST_DURATION_MS = 3000;

export function ExportButton({ href, fileName }: { href: string; fileName: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showToast]);

  async function handleExport() {
    setIsDownloading(true);
    try {
      const response = await fetch(href);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setShowToast(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={isDownloading}
        className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
      >
        {isDownloading ? "Exporting..." : "Export"}
      </button>

      {showToast && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-3 text-sm font-medium text-brand-body shadow-lg animate-[fade-slide_0.2s_ease-out]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon className="h-3 w-3" />
          </span>
          File downloaded successfully
        </div>
      )}
    </>
  );
}
