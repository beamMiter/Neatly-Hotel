"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "@/features/auth/actions";
import { inter, openSans } from "@/lib/fonts";

export function ForgotPasswordForm({ linkExpired = false }: { linkExpired?: boolean }) {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <form action={action} className="flex w-full max-w-113 flex-col gap-10">
      {linkExpired && !state && (
        <p className="text-sm text-red-600">
          That reset link is no longer valid. Links work once, and only in the browser that requested them — enter your
          email to get a fresh one.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={`${inter.className} text-base text-[#2A2E3F]`}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Enter your email"
          className={`${inter.className} h-12 rounded border border-[#D6D9E4] bg-white px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]`}
        />
        {state?.fieldErrors?.email && <p className="text-xs text-red-600">{state.fieldErrors.email}</p>}
      </div>

      {state?.message && (
        <p className={`text-sm ${state.sent ? "text-[#2F3E35]" : "text-red-600"}`}>{state.message}</p>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={pending}
          className={`${openSans.className} flex h-12 items-center justify-center rounded bg-[#C14817] text-base font-semibold text-white disabled:opacity-60`}
        >
          {pending ? "Sending..." : "Send Reset Link"}
        </button>

        <p className={`${inter.className} flex items-center gap-2 text-base tracking-[-0.02em] text-[#646D89]`}>
          Remembered your password?
          <Link href="/login" className={`${openSans.className} text-base font-semibold text-[#E76B39]`}>
            Log In
          </Link>
        </p>
      </div>
    </form>
  );
}
