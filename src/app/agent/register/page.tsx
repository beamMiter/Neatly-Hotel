import { AgentRegisterForm } from "@/features/auth/components/AgentRegisterForm";

export default function AgentRegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold">Agent register</h1>
      <AgentRegisterForm />
    </main>
  );
}
