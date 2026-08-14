-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- before using the register form or the /admin/room-property page.

create extension if not exists pgcrypto;

-- profiles: 1:1 with auth.users. `role` gates access to the admin panel.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  username text not null unique,
  phone text not null,
  date_of_birth date not null,
  country text not null,
  avatar_url text,
  role text not null default 'guest' check (role in ('guest', 'agent')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Rows are written server-side with the secret key, which bypasses RLS,
-- so only read/update policies are needed for the signed-in user.
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- To promote an existing guest to an agent (needed to sign in to
-- /admin/room-property), run:
--   update public.profiles set role = 'agent' where username = '<username>';

-- rooms: listed on the agent-only /admin/room-property page.
create table if not exists public.rooms (
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

alter table public.rooms enable row level security;

create policy "Agents can view rooms"
  on public.rooms for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'agent'
    )
  );

insert into public.rooms (room_type, price, promotion_price, guests, bed_type, room_size_sqm)
values
  ('Superior Garden View', 3000, 2500, 2, 'Double Bed', 32),
  ('Deluxe', 3000, 2500, 2, 'Double Bed', 32),
  ('Superior', 3000, 2500, 2, 'Double Bed', 32),
  ('Premier Sea View', 3000, 2500, 2, 'Double Bed', 32),
  ('Supreme', 3000, 2500, 2, 'Double Bed', 32),
  ('Suite', 3000, 2500, 2, 'Double Bed', 32);
