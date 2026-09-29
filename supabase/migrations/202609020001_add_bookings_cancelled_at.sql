-- Track when a booking was cancelled, so booking-history can show a real
-- "Cancellation date" instead of leaving it unset. Set by cancelBooking
-- (src/server/queries/bookings.query.ts) whenever status transitions to
-- 'cancelled' or 'refunded'; null otherwise.
alter table public.bookings
  add column if not exists cancelled_at timestamptz;

comment on column public.bookings.cancelled_at is
  'Set when a booking transitions to cancelled or refunded (see cancelBooking in bookings.query.ts); null otherwise.';
