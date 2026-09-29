-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query),
-- or via: npx prisma db execute --file supabase/migrations/202608210001_hotel_checkin_checkout.sql --schema prisma/schema.prisma
-- `npm run db:deploy` (prisma migrate deploy) only reads prisma/migrations/ —
-- files here are skipped silently (see 0004_profiles_grant.sql header).

-- Check-in/check-out times were hardcoded ("After 2:00 PM" / "Before 12:00 PM")
-- in the booking summary + success pages. Making them columns on the
-- single-row hotel_information table lets an admin change them without a
-- code change, while keeping the same values as the current hardcode and
-- the chatbot FAQ's stated policy as the default.
alter table hotel_information
  add column if not exists check_in_time  text not null default '14:00',
  add column if not exists check_out_time text not null default '12:00';

-- Separate ALTER, not inlined on the ADD COLUMN above: if the column already
-- exists, Postgres skips that whole subcommand — including any inline CHECK
-- — silently. See supabase/migrations/202608200001_booking_payment.sql §1.2.
do $$ begin
  alter table hotel_information add constraint hotel_information_check_in_time_format
    check (check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table hotel_information add constraint hotel_information_check_out_time_format
    check (check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
exception when duplicate_object then null; end $$;
