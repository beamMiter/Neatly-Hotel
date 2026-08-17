import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Set by /forgot-password/confirm when a reset link can't be redeemed.
  const linkExpired = (await searchParams).expired === "1";

  return (
    <AuthPageShell
      title="Forgot Password"
      description="Enter the email on your account and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm linkExpired={linkExpired} />
    </AuthPageShell>
  );
}
