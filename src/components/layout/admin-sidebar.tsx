"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/customer-booking",
    label: "Customer Booking",
    icon: BookingIcon,
  },
  {
    href: "/room-management",
    label: "Room Management",
    icon: RoomIcon,
  },
  {
    href: "/hotel-information",
    label: "Hotel Information",
    icon: HotelIcon,
  },
  {
    href: "/room-property",
    label: "Room & Property",
    icon: PropertyIcon,
  },
  {
    href: "/analytics",
    label: "Analytics Dashboard",
    icon: AnalyticsIcon,
  },
  {
    href: "/chatbot-setup",
    label: "Chatbot Setup",
    icon: ChatbotIcon,
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[#2D3E33] text-white">
      {/* Logo */}
      <div className="flex shrink-0 flex-col items-center px-4 pt-10 pb-8">
        <Image
          src="/images/neatly-logo-white.png"
          alt="NEATLY"
          width={167}
          height={45}
          quality={100}
          unoptimized
          className="h-[45px] w-auto mix-blend-screen"
          priority
        />
        <p className="mt-3 text-[12px] leading-none text-[#9AA59D]">
          Admin Panel Control
        </p>
      </div>

      {/* Menu — stays at top */}
      <nav className="flex shrink-0 flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-[52px] items-center gap-3.5 px-8 text-[14px] transition-colors ${
                active
                  ? "bg-[#5A6B5C] text-white"
                  : "text-[#C5CFC8] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Stretches to push Log Out to the bottom */}
      <div className="min-h-0 flex-1" aria-hidden />

      {/* Log Out — pinned to bottom */}
      <div className="shrink-0 border-t border-white/10">
        <button
          type="button"
          className="flex h-[52px] w-full items-center gap-3.5 px-8 text-[14px] text-[#C5CFC8] transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          Log Out
        </button>
      </div>
    </aside>
  );
}

function BookingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 8.2V6.7A2.7 2.7 0 0 1 10.7 4h2.6A2.7 2.7 0 0 1 16 6.7V8.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="8.2"
        width="16"
        height="11.8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 12.5h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="3.5"
        width="11.5"
        height="14.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="8.5"
        y="6"
        width="11.5"
        height="14.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m11.2 13.2 1.5 1.5 3.1-3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HotelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20.5V5.2A1.7 1.7 0 0 1 5.7 3.5h9.1A1.7 1.7 0 0 1 16.5 5.2V20.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16.5 9.5H19a1.5 1.5 0 0 1 1.5 1.5v9.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.5 7h2.2M7.5 10.5h2.2M7.5 14h2.2M3.5 20.5h17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PropertyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.2 20.2 8v8L12 20.8 3.8 16V8L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.2 20.2 8M12 12.2 3.8 8M12 12.2v8.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4a8 8 0 1 0 8 8h-8V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 3.6A8 8 0 0 1 20.4 9.8L14.2 12V3.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatbotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="4"
        width="17"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 10h8M8 13h5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m9 16.5-2.5 3.5V16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="4"
        width="10"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13.5 12H21m0 0-2.8-2.8M21 12l-2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
