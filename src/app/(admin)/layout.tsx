import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { getActiveAdminUser } from "@/server/services/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getActiveAdminUser())) {
    redirect("/login?error=access-denied");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F7F8FA]">
      <aside className="hidden h-screen w-[260px] shrink-0 lg:block">
        <AdminSidebar />
      </aside>
      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
