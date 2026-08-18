"use client";

import { useTransition } from "react";
import { logout } from "@/features/auth/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-60"
    >
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
