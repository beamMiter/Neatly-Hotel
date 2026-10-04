-- Expand bookings.status check constraint to match the app lifecycle.
-- Without this, POST /api/bookings fails with 23514 when inserting
-- pending_payment (credit card) or updating to checked_in / completed.
--
-- Apply once:
--   npm run db:apply-booking-status
-- or paste into Supabase SQL Editor.

-- Fresh Supabase branches reach this file before 202608200001_booking_payment.sql.
-- Bootstrap only the base table needed by this migration and 0008; the later
-- migration still creates booking_rooms, indexes, payment columns and grants.
-- Keep this shape in sync with that migration's baseline. Existing tables and
-- rows are left intact. Do not rename applied migration versions to reorder them.
-- As with the later baseline, verify the shared DB schema before deployment.
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  booking_code text not null,
  customer_id  uuid not null references auth.users(id),
  check_in     date not null,
  check_out    date not null,
  guests       int not null,
  status       text not null,
  total_amount numeric not null,
  created_at   timestamptz not null default now()
);

alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings add constraint bookings_status_check
  check (status in (
    'pending_payment',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'canceled',
    'refunded'
  ));
