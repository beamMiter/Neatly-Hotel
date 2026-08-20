import { BOOKING_DRAFT_STORAGE_KEY } from "@/features/booking-flow/constants";
import type { BookingDraft } from "@/features/booking-flow/types";

export function saveBookingDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
}
