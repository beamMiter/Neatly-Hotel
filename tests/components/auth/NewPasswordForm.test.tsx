// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mocks = vi.hoisted(() => ({ resetPassword: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/features/auth/actions", () => ({
  resetPassword: mocks.resetPassword,
}));
vi.mock("@/lib/fonts", () => ({
  inter: { className: "" },
  openSans: { className: "" },
}));

import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";
import { ToastProvider } from "@/components/shared/Toast";

function renderForm() {
  return render(
    <ToastProvider>
      <NewPasswordForm />
    </ToastProvider>,
  );
}

describe("NewPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Error Case", () => {
    it("shows an error toast when the reset link has expired", async () => {
      mocks.resetPassword.mockResolvedValue({
        message:
          "This reset link has expired. Request a new one and try again.",
      });
      const { container } = renderForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        expect(screen.getByRole("status").textContent).toContain(
          "This reset link has expired. Request a new one and try again.",
        );
      });
    });

    it("does not show a toast for field-level validation errors alone", () => {
      renderForm();

      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
