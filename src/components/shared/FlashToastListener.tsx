"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  FLASH_TOAST_MESSAGES,
  takeQueuedFlashToast,
} from "@/features/auth/flash-toast";

// Mounted once in the root layout, which — unlike a page component — never
// remounts on a client-side router.push(): the layout and everything in it
// persist across route changes, so a plain useEffect(fn, []) here would only
// ever fire once per hard page load, not on every navigation. Keying the
// effect on pathname makes it re-check after every route change, which is
// what actually makes a toast queued via queueFlashToast() right before a
// router.push() land on the destination page instead of never firing at all.
export function FlashToastListener() {
  const pathname = usePathname();

  useEffect(() => {
    const key = takeQueuedFlashToast();
    if (!key) return;
    const { title, description } = FLASH_TOAST_MESSAGES[key];
    toast.success(title, description ? { description } : undefined);
  }, [pathname]);

  return null;
}
