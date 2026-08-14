import type { Metadata } from "next";
import { LoginForm } from "@/features/admin/components/LoginForm";

export const metadata: Metadata = {
  title: "Agent Login | Neatly Hotel",
  description: "Sign in to the Neatly Hotel admin panel",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-sidebar px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h1 className="font-serif text-2xl text-brand-ink">Agent Login</h1>
        <p className="mt-1 text-sm text-brand-muted">Sign in to manage Neatly Hotel</p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
