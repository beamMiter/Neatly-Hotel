"use client";

import { useActionState } from "react";
import { resetPassword } from "@/features/auth/actions";
import { inter, openSans } from "@/lib/fonts";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <form action={action} className="flex w-full max-w-113 flex-col gap-10">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={`${inter.className} text-base text-[#2A2E3F]`}>
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Enter your new password"
          className={`${inter.className} h-12 rounded border border-[#D6D9E4] bg-white px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]`}
        />
        {state?.fieldErrors?.password && <p className="text-xs text-red-600">{state.fieldErrors.password}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className={`${inter.className} text-base text-[#2A2E3F]`}>
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Re-enter your new password"
          className={`${inter.className} h-12 rounded border border-[#D6D9E4] bg-white px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]`}
        />
        {state?.fieldErrors?.confirmPassword && (
          <p className="text-xs text-red-600">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`${openSans.className} flex h-12 cursor-pointer items-center justify-center rounded bg-[#C14817] text-base font-semibold text-white disabled:cursor-default disabled:opacity-60`}
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Saving...
          </span>
        ) : (
          "Save New Password"
        )}
      </button>
    </form>
  );
}
