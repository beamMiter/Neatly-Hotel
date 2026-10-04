// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/features/auth/actions", () => ({ login: mocks.login }));
vi.mock("@/lib/fonts", () => ({
  inter: { className: "" },
  openSans: { className: "" },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { LoginForm } from "@/features/auth/components/LoginForm";

function renderLoginForm(props: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  return render(<LoginForm {...props} />);
}

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("shows a toast and strips the query param after a password reset redirect", () => {
      renderLoginForm({ justResetPassword: true });

      expect(mocks.toastSuccess).toHaveBeenCalledWith("Password updated — please log in.");
      expect(mocks.replace).toHaveBeenCalledWith("/login");
    });

    it("preserves redirectTo when clearing the reset query param", () => {
      renderLoginForm({
        justResetPassword: true,
        redirectTo: "/room-management",
      });

      expect(mocks.replace).toHaveBeenCalledWith("/login?redirectTo=%2Froom-management");
    });

    it("shows an error toast when the login action returns a message", async () => {
      mocks.login.mockResolvedValue({ message: "Invalid email or password" });
      const { container } = renderLoginForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith("Invalid email or password");
      });
    });
  });

  describe("Error Case", () => {
    it("does not show a toast when justResetPassword is not set", () => {
      renderLoginForm();

      expect(mocks.toastSuccess).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
    });
  });
});
