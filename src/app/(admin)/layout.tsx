import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8FA]">
      <aside className="h-screen w-[260px] shrink-0">
        <AdminSidebar />
      </aside>
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
