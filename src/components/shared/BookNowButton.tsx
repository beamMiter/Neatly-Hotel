"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GuestBookingAlertDialog } from "@/components/shared/GuestBookingAlertDialog";

type BookNowButtonProps = {
  href: string;
  isLoggedIn: boolean;
  className: string;
  children: React.ReactNode;
};

// Gates "Book Now" for guests behind a warning + consent dialog before
// entering the booking wizard. Logged-in users skip straight through — the
// wizard itself already knows how to run a guest checkout, this only adds
// the up-front warning for people not signed in yet.
export function BookNowButton({ href, isLoggedIn, className, children }: BookNowButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  if (isLoggedIn) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setDialogOpen(true)} className={className}>
        {children}
      </button>
      <GuestBookingAlertDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onContinueAsGuest={() => router.push(href)}
        loginHref={`/login?redirectTo=${encodeURIComponent(href)}`}
      />
    </>
  );
}
