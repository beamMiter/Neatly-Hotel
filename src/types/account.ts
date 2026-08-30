// Minimal identity shown in chrome shared across pages (navbar) — deliberately
// smaller than ProfilePrefill (src/types/booking.ts), which carries every
// field the booking wizard needs to prefill a form.
export type AccountSummary = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};
