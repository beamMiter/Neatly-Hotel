// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/shared/Toast";

function TriggerButton({
  message,
  variant,
}: {
  message: string;
  variant?: "success" | "error";
}) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(message, variant)}>
      Trigger
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useToast", () => {
  describe("Happy Path", () => {
    it("shows a success toast with the given message", () => {
      render(
        <ToastProvider>
          <TriggerButton message="Saved successfully" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      expect(screen.getByRole("status").textContent).toContain(
        "Saved successfully",
      );
    });

    it("shows an error toast when the error variant is passed", () => {
      render(
        <ToastProvider>
          <TriggerButton message="Something went wrong" variant="error" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      expect(screen.getByRole("status").textContent).toContain(
        "Something went wrong",
      );
    });

    it("stacks multiple toasts instead of replacing the previous one", () => {
      function TwoToasts() {
        const toast = useToast();
        return (
          <button
            type="button"
            onClick={() => {
              toast("First");
              toast("Second");
            }}
          >
            Trigger
          </button>
        );
      }

      render(
        <ToastProvider>
          <TwoToasts />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      expect(screen.getAllByRole("status")).toHaveLength(2);
    });

    it("dismisses a toast automatically after its duration", () => {
      vi.useFakeTimers();
      render(
        <ToastProvider>
          <TriggerButton message="Auto-dismiss me" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("status")).toBeTruthy();

      act(() => vi.advanceTimersByTime(4000));
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("Error Case", () => {
    it("throws when called outside a ToastProvider", () => {
      expect(() => renderHook(() => useToast())).toThrow(
        "useToast must be used within <ToastProvider>",
      );
    });

    it("removes the toast immediately when its dismiss button is clicked", () => {
      render(
        <ToastProvider>
          <TriggerButton message="Dismiss me" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("status")).toBeTruthy();

      fireEvent.click(
        screen.getByRole("button", { name: "Dismiss notification" }),
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
