-- room_types, rooms, and room_images already exist in this Supabase project
-- (created directly and mapped via prisma/schema.prisma's RoomType / Room /
-- RoomImage models — do not `create table` for any of them here).
--
-- This migration only:
--   1. adds the two room_types columns the Room & Property UI needs that
--      aren't part of that schema (promotion_price, amenities)
--   2. adds INSERT policies for the agent-facing create-room flow — SELECT
--      was already open, but INSERT was not (verified: anon key got a
--      "row-level security policy" 42501/403 on both the tables and the
--      room-images storage bucket before this migration)
--
-- Run once in the Supabase SQL Editor.

alter table public.room_types
  add column if not exists promotion_price numeric,
  add column if not exists amenities text[] not null default '{}';

-- No agent/role gating yet — the admin panel isn't behind a login wall,
-- so these stay permissive like the existing read policies.
create policy "Room types are publicly insertable"
  on public.room_types for insert
  with check (true);

create policy "Room images are publicly insertable"
  on public.room_images for insert
  with check (true);

create policy "Room image files are publicly insertable"
  on storage.objects for insert
  with check (bucket_id = 'room-images');
