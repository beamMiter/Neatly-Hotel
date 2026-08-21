import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { isSafeRedirectPath } from "@/features/booking-flow/utils";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawRedirect = params.redirectTo;
  const redirectTo = typeof rawRedirect === "string" && isSafeRedirectPath(rawRedirect) ? rawRedirect : undefined;

  return (
    <AuthPageShell title="Log In">
      <LoginForm redirectTo={redirectTo} />
    </AuthPageShell>
  );
}
