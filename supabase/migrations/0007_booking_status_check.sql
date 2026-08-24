-- Expand bookings.status check constraint to match the app lifecycle.
-- Without this, POST /api/bookings fails with 23514 when inserting
-- pending_payment (credit card) or updating to checked_in / completed.
--
-- Apply once:
--   npm run db:apply-booking-status
-- or paste into Supabase SQL Editor.

alter table bookings drop constraint if exists bookings_status_check;

alter table bookings add constraint bookings_status_check
  check (status in (
    'pending_payment',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'canceled',
    'refunded'
  ));
