-- Allow guest bookings (no auth account) by making customer_id nullable.
-- Logged-in bookings still set customer_id to auth.users(id).
--
-- Apply once:
--   npm run db:apply-guest-booking
-- or paste into Supabase SQL Editor.
--
-- Do not run prisma migrate/db:push against the shared DB without the team.

alter table bookings alter column customer_id drop not null;
