-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query),
-- or via: npx prisma db execute --file supabase/migrations/202608210002_special_request_billing_type.sql --schema prisma/schema.prisma
-- `npm run db:deploy` (prisma migrate deploy) only reads prisma/migrations/ —
-- files here are skipped silently (see 0004_profiles_grant.sql header).

-- Replaces a flat is_countable boolean with a billing_type that matches how
-- each add-on is actually priced at a real hotel — adopted from the team's
-- feat/booking-flow branch (which hardcoded this in constants.ts), kept as a
-- DB column here instead so changing an item's billing doesn't need a code
-- deploy:
--   per_stay : flat, once per booking (baby cot, phone chargers)
--   per_night: auto-multiplied by nights, no manual count (extra bed/pillows)
--   per_leg  : outbound and/or return, 1 or 2 legs (airport transfer)
--   per_day_guest: per guest, applied across every night of the stay
--                  (breakfast) — a simplification of booking-flow's
--                  per-day-selectable picker; see AGENTS.md if that's ever
--                  needed instead of "every night."
alter table special_requests
  add column if not exists billing_type text not null default 'per_stay';

do $$ begin
  alter table special_requests add constraint special_requests_billing_type_check
    check (billing_type in ('per_stay', 'per_night', 'per_leg', 'per_day_guest'));
exception when duplicate_object then null; end $$;

update special_requests set billing_type = 'per_stay' where code in ('baby_cot', 'phone_chargers');
update special_requests set billing_type = 'per_night' where code in ('extra_bed', 'extra_pillows');
update special_requests set billing_type = 'per_leg' where code = 'airport_transfer';
update special_requests set billing_type = 'per_day_guest' where code = 'breakfast';
-- Standard requests are free and always single-select; per_stay is a no-op
-- for them (price is 0 either way) but keeps every row's semantics defined.
update special_requests set billing_type = 'per_stay' where category = 'standard';

alter table special_requests drop column if exists is_countable;
