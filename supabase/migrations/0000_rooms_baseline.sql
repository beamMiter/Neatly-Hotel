-- Run this once in the Supabase SQL Editor, or via
-- `npx dotenv -e .env.local -- npx prisma db execute --file supabase/migrations/0000_rooms_baseline.sql --schema prisma/schema.prisma`
--
-- room_types/rooms/room_images were "created directly and mapped via
-- prisma/schema.prisma" on the shared project (see 0002_rooms.sql's own
-- comment) — never through any tracked migration in this repo, same class
-- of gap as bookings/booking_rooms (202608200001_booking_payment.sql).
-- That's fine on the shared DB where they already exist, but it means
-- `npm run db:setup` silently has nothing to seed against on a genuinely
-- fresh database (local Postgres via DATABASE_URL, or a fresh Supabase
-- project) — `db:execute-hotel` only ever created `hotel_information`.
--
-- `create table if not exists` — a no-op wherever these already exist.
-- Named "0000_" (not a later timestamp) so `supabase db reset` applies it
-- before every other migration, since 0002_rooms.sql's `alter table
-- room_types add column ...` and 202608170001_enable_rooms_realtime.sql
-- both assume these tables already exist. Shape mirrors
-- prisma/schema.prisma's RoomType/Room/RoomImage models — same
-- unverified-guess caveat as every other migration in this set.

create table if not exists room_types (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  bed_type        text,
  capacity        int,
  size_sqm        numeric,
  base_price      numeric,
  promotion_price numeric,
  amenities       text[] not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  room_no       varchar(16) not null unique,
  room_type     varchar(100) not null,
  bed_type      varchar(50) not null,
  status        varchar(50) not null,
  room_type_id  uuid references room_types(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists rooms_status_idx on rooms(status);
create index if not exists rooms_room_no_idx on rooms(room_no);

create table if not exists room_images (
  id           uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references room_types(id),
  storage_path text not null,
  alt_text     text,
  sort_order   int not null default 0,
  is_cover     boolean not null default false
);

-- room_types/rooms/room_images are public-read (guests browse without
-- logging in) — grant select broadly; write access mirrors the INSERT
-- grants 0002_rooms.sql already adds for the admin create-room flow
-- (which itself assumes these tables pre-exist, hence running this first).
grant select on public.room_types, public.rooms, public.room_images to anon, authenticated;
grant select, insert, update, delete on public.room_types, public.rooms, public.room_images to service_role;
