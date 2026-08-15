"use client";

import { useActionState } from "react";
import { agentRegister } from "@/features/auth/actions";

export function AgentRegisterForm() {
  const [state, action, pending] = useActionState(agentRegister, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-md border border-gray-300 px-3.5 text-sm focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500"
        />
        {state?.fieldErrors?.email && <p className="text-xs text-red-600">{state.fieldErrors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="h-11 rounded-md border border-gray-300 px-3.5 text-sm focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500"
        />
        {state?.fieldErrors?.password && <p className="text-xs text-red-600">{state.fieldErrors.password}</p>}
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-gray-900 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
