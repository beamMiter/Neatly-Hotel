"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logout } from "@/features/auth/actions";
import { MenuIcon } from "@/components/icons/MenuIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";

const NAV_ITEMS = [
  {
    href: "/live-support",
    label: "Live Support",
    icon: SupportIcon,
  },
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

// Shared by the permanent desktop sidebar and the mobile drawer — the only
// difference between them is layout chrome (width, overlay, close button),
// not the nav content itself. `onNavigate` closes the drawer on mobile;
// it's undefined (a no-op) for the desktop instance.
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [liveSupportCount, setLiveSupportCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationCount = async () => {
      try {
        const response = await fetch("/api/live-support/admin?notifications=true", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json() as { unreadCount?: number };
        setLiveSupportCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
      } catch {
        // Keep the last known count when a polling request fails.
      }
    };

    void loadNotificationCount();
    const intervalId = window.setInterval(() => void loadNotificationCount(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div className="flex shrink-0 flex-col items-center px-4 pt-10 pb-8">
        <Link href="/" aria-label="Go to landing page" onClick={onNavigate}>
          <Image
            src="/images/neatly-logo-white.svg"
            alt="NEATLY"
            width={167}
            height={45}
            quality={100}
            unoptimized
            className="h-[45px] w-auto"
            priority
          />
        </Link>
        <p className="mt-3 text-[12px] leading-none text-[#9AA59D]">
          Admin Panel Control
        </p>
      </div>

      <nav className="flex shrink-0 flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex h-[52px] items-center gap-3.5 px-8 text-[14px] transition-colors ${
                active
                  ? "bg-[#5A6B5C] text-white"
                  : "text-[#C5CFC8] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.href === "/live-support" && liveSupportCount > 0 ? (
                <span
                  className="min-w-5 rounded-full bg-[#E5484D] px-1.5 text-center text-[11px] font-semibold leading-5 text-white"
                  aria-label={`${liveSupportCount} new customer chats`}
                >
                  {liveSupportCount > 99 ? "99+" : liveSupportCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className="shrink-0 border-t border-white/10">
        <button
          type="button"
          onClick={() => startTransition(() => logout())}
          disabled={pending}
          className="flex h-[52px] w-full cursor-pointer items-center gap-3.5 px-8 text-[14px] text-[#C5CFC8] transition-colors hover:bg-white/[0.04] hover:text-white disabled:cursor-default disabled:opacity-60"
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          {pending ? "Logging out..." : "Log Out"}
        </button>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer after any navigation, including the logo link. Adjusted
  // during render (not an effect) per React's "you might not need an
  // effect" guidance for resetting state when a derived value changes —
  // avoids the extra commit+effect+re-render cycle an effect would cause.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      {/* Mobile top bar — the permanent sidebar below only shows at lg+ */}
      <div className="flex h-14 shrink-0 items-center justify-between bg-[#2D3E33] px-4 text-white lg:hidden">
        <Link href="/" aria-label="Go to landing page">
          <Image
            src="/images/neatly-logo-white.svg"
            alt="NEATLY"
            width={120}
            height={32}
            quality={100}
            unoptimized
            className="h-8 w-auto"
            priority
          />
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop permanent sidebar */}
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col bg-[#2D3E33] text-white lg:flex">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-[260px] max-w-[80vw] flex-col bg-[#2D3E33] text-white">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <SidebarNav onNavigate={() => setIsOpen(false)} />
          </aside>
        </div>
      )}
    </>
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

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5a6.5 6.5 0 0 0-6.5 6.5v2.2a1.8 1.8 0 0 0 1.8 1.8h1.2V10.9a.9.9 0 0 0-.9-.9H6.8A5.2 5.2 0 0 1 12 4.8a5.2 5.2 0 0 1 5.2 5.2h-.8a.9.9 0 0 0-.9.9V15h1.2a1.8 1.8 0 0 0 1.8-1.8V11a6.5 6.5 0 0 0-6.5-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 16.6c.9.9 1.9 1.4 2.8 1.4s1.9-.5 2.8-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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
