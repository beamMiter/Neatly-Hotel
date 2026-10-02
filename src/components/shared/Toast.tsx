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

type ToastVariant = "success" | "error";
type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  isLeaving: boolean;
};

const DEFAULT_DURATION_MS = 4000;
// The fade-out animation plays during this final slice of the toast's
// lifetime, so it's fully finished by the time the toast actually unmounts.
const LEAVE_DURATION_MS = 200;

type ShowToast = (
  message: string,
  variant?: ToastVariant,
  durationMs?: number,
) => void;

const ToastContext = createContext<ShowToast | null>(null);

// Call from any client component — no prop drilling. Throws outside
// <ToastProvider> (mounted once in the root layout) so a missing provider
// fails loudly instead of silently dropping the toast.
export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast)
    throw new Error("useToast must be used within <ToastProvider>");
  return showToast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>(
    (message, variant = "success", durationMs = DEFAULT_DURATION_MS) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [
        ...prev,
        { id, message, variant, isLeaving: false },
      ]);

      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === id ? { ...toast, isLeaving: true } : toast,
          ),
        );
      }, durationMs - LEAVE_DURATION_MS);

      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const isSuccess = toast.variant === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
        toast.isLeaving
          ? "animate-[fade-out_0.2s_ease-in]"
          : "animate-[fade-slide_0.2s_ease-out]"
      } ${isSuccess ? "border-brand-border bg-white text-brand-body" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isSuccess
            ? "bg-emerald-100 text-emerald-600"
            : "bg-red-100 text-red-600"
        }`}
      >
        {isSuccess ? (
          <CheckIcon className="h-3 w-3" />
        ) : (
          <AlertCircleIcon className="h-3.5 w-3.5" />
        )}
      </span>
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 cursor-pointer text-base leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
