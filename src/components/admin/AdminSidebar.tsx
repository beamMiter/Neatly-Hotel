"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "@/components/icons/PlusIcon";

const NAV_ITEMS = [
  { href: "/admin/customer-booking", label: "Customer Booking", icon: "/icons/icon/wallet.png" },
  { href: "/admin/room-management", label: "Room Management", icon: "/icons/icon/manage.png" },
  { href: "/admin/hotel-information", label: "Hotel Information", icon: "/icons/icon/hotel.png" },
  { href: "/admin/room-property", label: "Room & Property", icon: "/icons/icon/room.png" },
  { href: "/admin/analytics-dashboard", label: "Analytics Dashboard", icon: "/icons/icon/analytic.png" },
  { href: "/admin/chatbot-setup", label: "Chatbot Setup", icon: "/icons/icon/chat.png" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-admin-sidebar px-4 py-6">
      <div className="flex items-center gap-1 px-2">
        <PlusIcon className="h-3.5 w-3.5 text-brand-primary" />
        <span className="font-serif text-lg font-semibold text-white">NEATLY</span>
      </div>
      <p className="px-2 pt-1 text-xs text-admin-sidebar-muted">Admin Panel Control</p>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-admin-sidebar-active text-white"
                  : "text-admin-sidebar-muted hover:bg-admin-sidebar-active/50 hover:text-white"
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={18}
                height={18}
                className={`h-4.5 w-4.5 brightness-0 invert transition-opacity ${
                  isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        <form action="/admin/logout" method="POST">
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-active/50 hover:text-white"
          >
            <Image
              src="/icons/icon/logout.png"
              alt=""
              width={18}
              height={18}
              className="h-4.5 w-4.5 brightness-0 invert opacity-60 transition-opacity group-hover:opacity-100"
            />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
