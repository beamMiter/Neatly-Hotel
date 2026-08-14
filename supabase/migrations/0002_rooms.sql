-- Run this once in the Supabase SQL Editor, after 0001_profiles.sql,
-- before using the /room-property admin page.

create extension if not exists pgcrypto;

-- room_types: the room-type/rate catalog shown on the Room & Property page.
-- Named to avoid colliding with the existing `rooms` table (Prisma's
-- Room model), which tracks individual room numbers and housekeeping
-- status for Room Management — a different concern entirely.
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  room_type text not null,
  price numeric(10, 2) not null,
  promotion_price numeric(10, 2),
  guests integer not null,
  bed_type text not null,
  room_size_sqm integer not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.room_types enable row level security;

-- No agent/role gating yet — the admin panel itself isn't behind a login
-- wall right now, so room_types is simply readable by anyone with the anon key.
create policy "Room types are publicly readable"
  on public.room_types for select
  using (true);

insert into public.room_types (room_type, price, promotion_price, guests, bed_type, room_size_sqm)
values
  ('Superior Garden View', 3000, 2500, 2, 'Double Bed', 32),
  ('Deluxe', 3000, 2500, 2, 'Double Bed', 32),
  ('Superior', 3000, 2500, 2, 'Double Bed', 32),
  ('Premier Sea View', 3000, 2500, 2, 'Double Bed', 32),
  ('Supreme', 3000, 2500, 2, 'Double Bed', 32),
  ('Suite', 3000, 2500, 2, 'Double Bed', 32);
