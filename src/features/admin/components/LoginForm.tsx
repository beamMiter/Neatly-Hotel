"use client";

import { useActionState } from "react";
import { signInAgent, type LoginState } from "@/features/admin/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAgent, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-brand-body">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="Enter your email"
          className="h-11 rounded-md border border-brand-border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-brand-body">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="Enter your password"
          className="h-11 rounded-md border border-brand-border bg-white px-3.5 text-sm text-brand-body placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-md bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Log In"}
      </button>
    </form>
  );
}
