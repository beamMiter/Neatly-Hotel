-- room_types, rooms, and room_images already exist in this Supabase project
-- (created directly and mapped via prisma/schema.prisma's RoomType / Room /
-- RoomImage models — do not `create table` for any of them here).
--
-- This migration only:
--   1. adds the two room_types columns the Room & Property UI needs that
--      aren't part of that schema (promotion_price, amenities)
--   2. grants INSERT + adds INSERT policies for the agent-facing create-room
--      flow. SELECT was already open on both tables, but INSERT was not:
--      room_types was missing a working RLS policy (an earlier same-named
--      policy existed but still rejected inserts, so it's dropped and
--      recreated here) and room_images was missing the base GRANT entirely
--      ("permission denied for table room_images", not an RLS error).
--
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.room_types
  add column if not exists promotion_price numeric,
  add column if not exists amenities text[] not null default '{}';

grant insert on public.room_types to anon, authenticated;
grant insert on public.room_images to anon, authenticated;

-- No agent/role gating yet — the admin panel isn't behind a login wall,
-- so these stay permissive like the existing read policies.
-- `to anon, authenticated` explicitly, matching the existing working SELECT
-- policies on these tables — a `with check (true)` policy with no `to`
-- clause (implicit `public` pseudo-role) was created successfully but still
-- rejected anon-key inserts, so this repo assumes explicit roles are needed.
drop policy if exists "Room types are publicly insertable" on public.room_types;
create policy "Room types are publicly insertable"
  on public.room_types for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Room images are publicly insertable" on public.room_images;
create policy "Room images are publicly insertable"
  on public.room_images for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Room image files are publicly insertable" on storage.objects;
create policy "Room image files are publicly insertable"
  on storage.objects for insert
  with check (bucket_id = 'room-images');
