// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/features/auth/actions", () => ({
  resetPassword: mocks.resetPassword,
}));
vi.mock("@/lib/fonts", () => ({
  inter: { className: "" },
  openSans: { className: "" },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: mocks.toastError },
}));

import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";

function renderForm() {
  return render(<NewPasswordForm />);
}

describe("NewPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Error Case", () => {
    it("shows an error toast with a title and description when the reset link has expired", async () => {
      mocks.resetPassword.mockResolvedValue({
        message: "This reset link has expired. Request a new one and try again.",
      });
      const { container } = renderForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith("Reset link expired", {
          description: "Request a new one and try again.",
        });
      });
    });

    it("does not show a toast for field-level validation errors alone", () => {
      renderForm();

      expect(mocks.toastError).not.toHaveBeenCalled();
    });
  });
});
