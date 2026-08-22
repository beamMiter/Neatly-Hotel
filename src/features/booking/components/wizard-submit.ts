export type SubmitBookingResult =
  | { ok: true; bookingId: string; clientSecret: string | null }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
