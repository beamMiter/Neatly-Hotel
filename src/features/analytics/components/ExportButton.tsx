"use client";

import { useState } from "react";
import { toast } from "sonner";

export function ExportButton({ href, fileName }: { href: string; fileName: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleExport() {
    setIsDownloading(true);
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("File downloaded successfully");
    } catch (err) {
      console.error("[export] failed to download CSV:", err);
      toast.error("Something went wrong, unable to provide details");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDownloading}
      className="flex items-center justify-center rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
    >
      {isDownloading ? (
        <span className="flex items-center justify-center gap-1.5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Exporting...
        </span>
      ) : (
        "Export"
      )}
    </button>
  );
}
