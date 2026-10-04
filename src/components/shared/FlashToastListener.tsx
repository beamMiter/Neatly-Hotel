"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  FLASH_TOAST_COOKIE_NAME,
  FLASH_TOAST_MESSAGES,
  type FlashToastKey,
} from "@/features/auth/flash-toast";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

// Mounted once in the root layout so it fires regardless of which page a
// server redirect() lands on (login's destination varies by role / redirectTo).
export function FlashToastListener() {
  useEffect(() => {
    const key = readCookie(FLASH_TOAST_COOKIE_NAME);
    if (!key || !(key in FLASH_TOAST_MESSAGES)) return;

    toast.success(FLASH_TOAST_MESSAGES[key as FlashToastKey]);
    clearCookie(FLASH_TOAST_COOKIE_NAME);
  }, []);

  return null;
}
