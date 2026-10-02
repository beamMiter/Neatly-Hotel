"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";

export type ToastVariant = "success" | "error";
export type ToastOptions = {
  variant?: ToastVariant;
  // A second line under the title — only pass this when the title alone
  // doesn't say enough (e.g. the title is a short headline and the
  // description is the full explanatory sentence). Most toasts don't need
  // one.
  description?: string;
  durationMs?: number;
};

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  isLeaving: boolean;
};

const DEFAULT_DURATION_MS = 4000;
// The fade-out animation plays during this final slice of the toast's
// lifetime, so it's fully finished by the time the toast actually unmounts.
const LEAVE_DURATION_MS = 200;

type ShowToast = (title: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

// Call from any client component — no prop drilling. Throws outside
// <ToastProvider> (mounted once in the root layout) so a missing provider
// fails loudly instead of silently dropping the toast.
export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used within <ToastProvider>");
  return showToast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>(
    (title, options = {}) => {
      const { variant = "success", description, durationMs = DEFAULT_DURATION_MS } = options;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, description, variant, isLeaving: false }]);

      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) => (toast.id === id ? { ...toast, isLeaving: true } : toast)),
        );
      }, durationMs - LEAVE_DURATION_MS);

      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Full-width with side margins on mobile (no toast library's fixed
          desktop width reads well at 375px); fixed top-right with room to
          breathe on sm+, where cards shrink to their content instead of
          stretching full width. */}
      <div className="fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-3 sm:inset-x-auto sm:top-6 sm:right-6 sm:items-end">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isSuccess = toast.variant === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-start gap-3 rounded-xl border px-5 py-4 shadow-lg sm:w-auto sm:min-w-[320px] sm:max-w-sm ${
        toast.isLeaving ? "animate-[fade-out_0.2s_ease-in]" : "animate-[fade-slide_0.2s_ease-out]"
      } ${isSuccess ? "border-brand-border bg-white" : "border-red-200 bg-red-50"}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isSuccess ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
        }`}
      >
        {isSuccess ? <CheckIcon className="h-5 w-5" /> : <AlertCircleIcon className="h-5 w-5" />}
      </span>
      <div className="flex-1 pt-0.5">
        <p className={`text-sm font-semibold ${isSuccess ? "text-brand-body" : "text-red-700"}`}>
          {toast.title}
        </p>
        {toast.description && (
          <p className={`mt-0.5 text-sm leading-snug ${isSuccess ? "text-brand-muted" : "text-red-600"}`}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer rounded p-1 text-lg leading-none opacity-60 hover:bg-black/5 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
