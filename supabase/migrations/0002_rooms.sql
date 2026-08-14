-- Run this once in the Supabase SQL Editor, after 0001_profiles.sql,
-- before using the /room-property admin pages.

create extension if not exists pgcrypto;

-- room_types: the room-type/rate catalog shown on the Room & Property page.
-- Named to avoid colliding with the existing `rooms` table (Prisma's
-- Room model), which tracks individual room numbers and housekeeping
-- status for Room Management — a different concern entirely.
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  room_type text not null,
  description text not null default '',
  price numeric(10, 2) not null,
  promotion_price numeric(10, 2),
  guests integer not null,
  bed_type text not null,
  room_size_sqm integer not null,
  main_image_url text,
  gallery_image_urls text[] not null default '{}',
  amenities text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.room_types enable row level security;

-- No agent/role gating yet — the admin panel itself isn't behind a login
-- wall right now, so room_types is readable/writable by anyone with the
-- anon key. Tighten this once agent auth exists.
create policy "Room types are publicly readable"
  on public.room_types for select
  using (true);

create policy "Room types are publicly insertable"
  on public.room_types for insert
  with check (true);

insert into public.room_types (room_type, price, promotion_price, guests, bed_type, room_size_sqm)
values
  ('Superior Garden View', 3000, 2500, 2, 'Double Bed', 32),
  ('Deluxe', 3000, 2500, 2, 'Double Bed', 32),
  ('Superior', 3000, 2500, 2, 'Double Bed', 32),
  ('Premier Sea View', 3000, 2500, 2, 'Double Bed', 32),
  ('Supreme', 3000, 2500, 2, 'Double Bed', 32),
  ('Suite', 3000, 2500, 2, 'Double Bed', 32);

insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do nothing;

create policy "Room images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'room-images');

create policy "Room images are publicly insertable"
  on storage.objects for insert
  with check (bucket_id = 'room-images');
