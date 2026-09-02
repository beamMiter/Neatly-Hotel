-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query),
-- or `npx prisma db execute --file supabase/migrations/202609010001_add_promptpay_payment_method.sql
-- --schema prisma/schema.prisma`.
--
-- `npm run db:deploy` (== `prisma migrate deploy`) will NOT apply this file —
-- see the header of 202608200001_booking_payment.sql for why.
--
-- Adds "promptpay" to bookings.payment_method's allowed values. A CHECK
-- constraint's allowed list can't be widened in place — Postgres has no
-- ALTER CONSTRAINT for that, only drop + recreate. `bookings_payment_method_check`
-- was created by 202608200001_booking_payment.sql as ('credit_card','cash').

do $$ begin
  alter table bookings drop constraint bookings_payment_method_check;
exception when undefined_object then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_payment_method_check
    check (payment_method in ('credit_card', 'cash', 'promptpay'));
exception when duplicate_object then null; end $$;
