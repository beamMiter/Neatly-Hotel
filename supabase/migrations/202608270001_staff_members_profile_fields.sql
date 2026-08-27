-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- Confirmed with the team: staff/admin identity is kept separate from
-- customer `profiles` (staff_members sees little traffic, so a few extra
-- columns here is low-risk). No date_of_birth/country — nothing in the
-- product reads those for a staff account (booking-relevant customer
-- fields only).
alter table public.staff_members
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists phone      text,
  add column if not exists avatar_url text;

-- Column-level grant, not a blanket `grant update on staff_members` — a
-- staff member may only ever touch their own name/phone/avatar, never
-- `role` or `is_active` (those stay service_role-only, set via
-- admin bootstrap). RLS below restricts which ROW; this restricts which
-- COLUMNS, so a self-service UPDATE can't smuggle in a role/is_active
-- change even on their own row.
grant update (first_name, last_name, phone, avatar_url) on public.staff_members to authenticated;

create policy "Staff can update their own profile fields"
  on public.staff_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
