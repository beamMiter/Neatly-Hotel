"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { login } from "@/features/auth/actions";
import { toast } from "sonner";
import { queueFlashToast } from "@/features/auth/flash-toast";
import { inter, openSans } from "@/lib/fonts";

type LoginFormProps = {
  redirectTo?: string;
  justResetPassword?: boolean;
};

export function LoginForm({ redirectTo, justResetPassword }: LoginFormProps) {
  const [state, action, pending] = useActionState(login, undefined);
  const router = useRouter();
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  // Runs once per mount, not once per render — the ref guards against
  // double-firing from React's dev-mode double-invoke of effects, which
  // would otherwise show this toast twice.
  const hasShownResetToast = useRef(false);
  useEffect(() => {
    if (!justResetPassword || hasShownResetToast.current) return;
    hasShownResetToast.current = true;
    toast.success("Password updated — please log in.");
    // Drop the query param so refreshing this page doesn't re-show it.
    router.replace("/login" + (redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""));
  }, [justResetPassword, redirectTo, router]);

  useEffect(() => {
    if (state && "message" in state && state.message) toast.error(state.message);
  }, [state]);

  // login() returns a destination instead of calling redirect() itself —
  // redirect() inside the action didn't reliably show a toast queued just
  // before it, so the navigation happens here instead, same as logout() in
  // Navbar.tsx / admin-sidebar.tsx. queueFlashToast (not toast.success
  // directly) so the toast appears once the destination page has mounted,
  // not as a flash on this page a moment before router.push takes over.
  useEffect(() => {
    if (state && "redirectTo" in state) {
      queueFlashToast("signed-in");
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex w-full max-w-113 flex-col gap-10">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={`${inter.className} text-base text-[#2A2E3F]`}>
          Username or Email
        </label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder="Enter your username or email"
          className={`${inter.className} h-12 rounded border border-[#D6D9E4] bg-white px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]`}
        />
        {fieldErrors?.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={`${inter.className} text-base text-[#2A2E3F]`}>
            Password
          </label>
          <Link href="/forgot-password" className={`${inter.className} text-sm font-semibold text-[#E76B39]`}>
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className={`${inter.className} h-12 rounded border border-[#D6D9E4] bg-white px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]`}
        />
        {fieldErrors?.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={pending}
          className={`${openSans.className} flex h-12 cursor-pointer items-center justify-center rounded bg-[#C14817] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90 disabled:cursor-default disabled:opacity-60`}
        >
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Logging in...
            </span>
          ) : (
            "Log In"
          )}
        </button>

        <p className={`${inter.className} flex items-center gap-2 text-base tracking-[-0.02em] text-[#646D89]`}>
          Don&apos;t have an account yet?
          <Link href="/register" className={`${openSans.className} text-base font-semibold text-[#E76B39]`}>
            Register
          </Link>
        </p>
      </div>
    </form>
  );
}
