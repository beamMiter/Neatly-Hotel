import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthPageShell title="Log In">
      <LoginForm />
    </AuthPageShell>
  );
}
