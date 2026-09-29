"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/features/auth/actions";
import { inter, openSans } from "@/lib/fonts";

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, action, pending] = useActionState(login, undefined);

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
        {state?.fieldErrors?.email && <p className="text-xs text-red-600">{state.fieldErrors.email}</p>}
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
        {state?.fieldErrors?.password && <p className="text-xs text-red-600">{state.fieldErrors.password}</p>}
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

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
