import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";
import { RECOVERY_COOKIE_NAME } from "@/features/auth/recovery-session";
import { createClient } from "@/server/db/supabase-server";

export default async function ForgotPasswordResetPage() {
  // Bounce before rendering the form rather than after a submit, so an
  // expired link doesn't cost the user two password entries first. The action
  // re-checks both of these independently — this is just the early exit.
  const hasRecoveryMarker = (await cookies()).get(RECOVERY_COOKIE_NAME);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasRecoveryMarker || !user) {
    redirect("/forgot-password?expired=1");
  }

  return (
    <AuthPageShell title="Set New Password">
      <NewPasswordForm />
    </AuthPageShell>
  );
}
