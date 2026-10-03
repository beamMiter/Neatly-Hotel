// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/features/auth/actions", () => ({
  forgotPassword: mocks.forgotPassword,
}));
vi.mock("@/lib/fonts", () => ({
  inter: { className: "" },
  openSans: { className: "" },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

function renderForm(props: Partial<React.ComponentProps<typeof ForgotPasswordForm>> = {}) {
  return render(<ForgotPasswordForm {...props} />);
}

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("shows a success toast with a title and description once the reset email is sent", async () => {
      mocks.forgotPassword.mockResolvedValue({
        sent: true,
        message: "If an account exists for that email, a reset link is on its way.",
      });
      const { container } = renderForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        expect(mocks.toastSuccess).toHaveBeenCalledWith("Reset link sent", {
          description: "If an account exists for that email, a reset link is on its way.",
        });
      });
    });
  });

  describe("Error Case", () => {
    it("keeps the expired-link warning inline, not as a toast", () => {
      renderForm({ linkExpired: true });

      expect(screen.getByText(/That reset link is no longer valid/)).toBeTruthy();
      expect(mocks.toastSuccess).not.toHaveBeenCalled();
    });
  });
});
