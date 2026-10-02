// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
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

import { LoginForm } from "@/features/auth/components/LoginForm";
import { ToastProvider } from "@/components/shared/Toast";

function renderLoginForm(
  props: Partial<React.ComponentProps<typeof LoginForm>> = {},
) {
  return render(
    <ToastProvider>
      <LoginForm {...props} />
    </ToastProvider>,
  );
}

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("shows a toast and strips the query param after a password reset redirect", () => {
      renderLoginForm({ justResetPassword: true });

      expect(screen.getByRole("status").textContent).toContain(
        "Password updated — please log in.",
      );
      expect(mocks.replace).toHaveBeenCalledWith("/login");
    });

    it("preserves redirectTo when clearing the reset query param", () => {
      renderLoginForm({
        justResetPassword: true,
        redirectTo: "/room-management",
      });

      expect(mocks.replace).toHaveBeenCalledWith(
        "/login?redirectTo=%2Froom-management",
      );
    });

    it("shows an error toast when the login action returns a message", async () => {
      mocks.login.mockResolvedValue({ message: "Invalid email or password" });
      const { container } = renderLoginForm();

      fireEvent.submit(container.querySelector("form")!);

      await waitFor(() => {
        expect(screen.getByRole("status").textContent).toContain(
          "Invalid email or password",
        );
      });
    });
  });

  describe("Error Case", () => {
    it("does not show a toast when justResetPassword is not set", () => {
      renderLoginForm();

      expect(screen.queryByRole("status")).toBeNull();
      expect(mocks.replace).not.toHaveBeenCalled();
    });
  });
});
