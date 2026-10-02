// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { ToastProvider, useToast, type ToastOptions } from "@/components/shared/Toast";

function TriggerButton({ title, options }: { title: string; options?: ToastOptions }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(title, options)}>
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
    it("shows a success toast with the given title", () => {
      render(
        <ToastProvider>
          <TriggerButton title="Saved successfully" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      expect(screen.getByRole("status").textContent).toContain("Saved successfully");
    });

    it("shows an error toast when the error variant is passed", () => {
      render(
        <ToastProvider>
          <TriggerButton title="Something went wrong" options={{ variant: "error" }} />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      expect(screen.getByRole("status").textContent).toContain("Something went wrong");
    });

    it("shows the description under the title when one is given", () => {
      render(
        <ToastProvider>
          <TriggerButton
            title="Reset link sent"
            options={{ description: "If an account exists for that email, a reset link is on its way." }}
          />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      const status = screen.getByRole("status");
      expect(status.textContent).toContain("Reset link sent");
      expect(status.textContent).toContain("If an account exists for that email, a reset link is on its way.");
    });

    it("renders no description paragraph when none is given", () => {
      render(
        <ToastProvider>
          <TriggerButton title="Profile updated." />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

      // Title-only toasts have exactly one text node under the status role —
      // a second <p> would mean an empty description paragraph is rendering.
      expect(screen.getByRole("status").querySelectorAll("p")).toHaveLength(1);
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
          <TriggerButton title="Auto-dismiss me" />
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
      expect(() => renderHook(() => useToast())).toThrow("useToast must be used within <ToastProvider>");
    });

    it("removes the toast immediately when its dismiss button is clicked", () => {
      render(
        <ToastProvider>
          <TriggerButton title="Dismiss me" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("status")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
