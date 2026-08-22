-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query),
-- or `npx prisma db execute --file supabase/migrations/202608200001_booking_payment.sql
-- --schema prisma/schema.prisma` (same mechanism as the existing `db:seed-rooms` script).
--
-- `npm run db:deploy` (== `prisma migrate deploy`) will NOT apply this file —
-- that command only reads `prisma/migrations/`, and this repo's `bookings`/
-- `booking_rooms` tables were never created through a tracked Prisma
-- migration in the first place (see AGENTS.md). Additive only — never run
-- `db:migrate`/`db:push` against the shared DB without the team first.
--
-- Columns below are based on `prisma/schema.prisma`'s Booking/BookingRoom
-- models, which is itself an unverified best guess (never confirmed against
-- the live DB by a tracked migration). Run `npx prisma db pull --print`
-- yourself before applying this to the shared database to confirm the real
-- column list — live introspection could not be completed in the sandboxed
-- environment this migration was authored in (DATABASE_URL connection was
-- unreachable).

-- ─── 0) baseline bookings/booking_rooms — `IF NOT EXISTS`, a no-op wherever
--        they already exist (the shared DB). On an environment where they've
--        never existed (e.g. DATABASE_URL pointed at local Postgres for
--        local testing, which only ever got room_types/rooms/hotel_information
--        via `npm run db:setup`), this creates them so the rest of this
--        migration and the app's booking code has something to run against.
--        Shape mirrors prisma/schema.prisma's Booking/BookingRoom models —
--        same "unverified guess" caveat as the header above. Requires
--        `npm run db:setup` to have already created room_types/rooms first
--        (booking_rooms.room_id references rooms). ───
create table if not exists bookings (
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

create table if not exists booking_rooms (
  booking_id      uuid not null references bookings(id),
  room_id         uuid not null references rooms(id),
  price_per_night numeric not null,
  primary key (booking_id, room_id)
);

create index if not exists bookings_customer_id_idx on bookings(customer_id);
create index if not exists bookings_check_in_out_idx on bookings(check_in, check_out);
create index if not exists booking_rooms_room_id_idx on booking_rooms(room_id);

-- ─── 1) bookings: guest info captured at booking time, special/standard
--        requests selected, promo used, payment method/status, hold expiry ───
alter table bookings
  add column if not exists guest_first_name    text,
  add column if not exists guest_last_name     text,
  add column if not exists guest_email         text,
  add column if not exists guest_phone         text,
  add column if not exists guest_date_of_birth date,
  add column if not exists guest_country       text,
  add column if not exists standard_requests   jsonb not null default '[]'::jsonb,
  add column if not exists special_requests    jsonb not null default '[]'::jsonb,
  add column if not exists addons_total        numeric not null default 0,
  add column if not exists additional_request  text,
  add column if not exists promo_code          text,
  add column if not exists discount_amount     numeric not null default 0,
  add column if not exists payment_method      text,
  add column if not exists payment_status      text,
  add column if not exists expires_at          timestamptz;

comment on column bookings.guest_first_name is
  'Guest contact captured at booking time — deliberately separate from profiles, since a booking may be made on behalf of someone else. Nullable rather than default '''' on purpose: a booking with blank guest data should be visibly incomplete, not silently valid.';
comment on column bookings.standard_requests is
  'JSON array of selected free standard-request codes. Catalog lives in the special_requests table (category=''standard''), not hardcoded.';
comment on column bookings.special_requests is
  'JSON array of {code,label,price} for selected priced add-ons — price snapshot at time of booking, catalog (special_requests table, category=''special'') may change later.';
comment on column bookings.expires_at is
  'Payment hold deadline for pending_payment bookings (30 min from creation). Booking/room search queries must treat an expired, still-pending booking as non-blocking — see booking-search.query.ts / room-availability.query.ts.';

-- Backfill + constrain payment_method/payment_status as separate statements
-- (NOT inline on the ADD COLUMN above) — if a column already exists,
-- `add column if not exists ... check (...)` skips the whole subcommand,
-- CHECK included, so it silently produces no constraint at all on a
-- pre-existing column. Doing it as its own idempotent block avoids that trap.
update bookings set payment_method = 'credit_card' where payment_method is null;
update bookings set payment_status = 'pending'     where payment_status is null;

alter table bookings alter column payment_method set default 'credit_card';
alter table bookings alter column payment_status set default 'pending';
alter table bookings alter column payment_method set not null;
alter table bookings alter column payment_status set not null;

do $$ begin
  alter table bookings add constraint bookings_payment_method_check
    check (payment_method in ('credit_card','cash'));
exception when duplicate_object or duplicate_table then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_payment_status_check
    check (payment_status in ('pending','paid','failed','pay_at_hotel'));
exception when duplicate_object or duplicate_table then null; end $$;

-- Uniqueness backstop for the app-generated booking_code (NB-YYYYMMDD-XXXX)
-- — collision odds are already negligible, this just makes it impossible.
do $$ begin
  alter table bookings add constraint bookings_booking_code_key unique (booking_code);
exception when duplicate_object or duplicate_table then null; end $$;

-- ─── 2) payments: one row per Stripe payment attempt — audit trail, retry
--        after a failure inserts a new row rather than mutating this one ───
create table if not exists payments (
  id                        uuid primary key default gen_random_uuid(),
  booking_id                uuid not null references bookings(id),
  stripe_payment_intent_id  text not null unique,
  amount                    numeric not null,
  currency                  text not null default 'thb',
  status                    text not null default 'requires_payment_method'
    check (status in ('requires_payment_method','requires_confirmation','requires_action',
                      'processing','succeeded','canceled','failed')),
  card_brand                text,
  card_last4                text,
  failure_message           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists payments_booking_id_idx on payments(booking_id);

-- payments holds financial data — RLS on, no policies, and no grant to
-- anon/authenticated at all. Only service_role can touch it, and only via
-- our own server code (never exposed through PostgREST to end users).
alter table payments enable row level security;
grant select, insert, update on public.payments to service_role;

-- ─── 3) special_requests: real DB table (not hardcoded) so
--        codes/prices can change without a code deploy ───
create table if not exists special_requests (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label      text not null,
  category   text not null check (category in ('standard', 'special')),
  price      numeric not null default 0,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into special_requests (code, label, category, price, sort_order) values
  ('early_check_in',   'Early Check-in',              'standard', 0,   1),
  ('late_check_out',   'Late Check-out',              'standard', 0,   2),
  ('non_smoking',      'Non-Smoking Room',            'standard', 0,   3),
  ('high_floor',       'A room on the high floor',    'standard', 0,   4),
  ('quiet_room',       'A quiet room',                'standard', 0,   5),
  ('baby_cot',         'Baby cot',                    'special',  400, 1),
  ('airport_transfer', 'Airport transfer',            'special',  200, 2),
  ('extra_bed',        'Extra bed',                   'special',  500, 3),
  ('extra_pillows',    'Extra pillows',                'special', 100, 4),
  ('phone_chargers',   'Phone chargers and adapters', 'special',  100, 5),
  ('breakfast',        'Breakfast',                   'special',  150, 6)
on conflict (code) do nothing;

-- ─── 4) grants — this repo has been bitten by missing base grants three
--        times already (0002_rooms.sql, 0003_staff_members.sql,
--        0004_profiles_grant.sql): RLS is only evaluated AFTER the
--        table-level grant check passes, and service_role bypasses RLS
--        but NOT the base grant. Catalog tables are public-read (every
--        guest must see them while booking) but writable only by
--        service_role — there is no end-user-facing write path. ───
grant select on public.special_requests to anon, authenticated;
grant select, insert, update, delete on public.special_requests to service_role;

-- Re-affirm service_role can write bookings/booking_rooms — idempotent
-- and harmless if already granted, cheap insurance against the same class
-- of gap this migration's comment block just described.
grant select, insert, update on public.bookings      to service_role;
grant select, insert, update on public.booking_rooms to service_role;
