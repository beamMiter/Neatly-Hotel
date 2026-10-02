// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mocks = vi.hoisted(() => ({ forgotPassword: vi.fn() }));

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

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { ToastProvider } from "@/components/shared/Toast";

function renderForm(
  props: Partial<React.ComponentProps<typeof ForgotPasswordForm>> = {},
) {
  return render(
    <ToastProvider>
      <ForgotPasswordForm {...props} />
    </ToastProvider>,
  );
}

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("shows a success toast once the reset email is sent", async () => {
      mocks.forgotPassword.mockResolvedValue({
        sent: true,
        message:
          "If an account exists for that email, a reset link is on its way.",
      });
      const { container } = renderForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        const status = screen.getByRole("status").textContent;
        expect(status).toContain("Reset link sent");
        expect(status).toContain(
          "If an account exists for that email, a reset link is on its way.",
        );
      });
    });
  });

  describe("Error Case", () => {
    it("keeps the expired-link warning inline, not as a toast", () => {
      renderForm({ linkExpired: true });

      expect(
        screen.getByText(/That reset link is no longer valid/),
      ).toBeTruthy();
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
