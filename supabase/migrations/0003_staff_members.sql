-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- staff_members: back-office access gate, separate from `profiles`. A row
-- here with role `admin` can sign in to the admin panel; no row means a
-- regular customer (`user`).

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- RLS policies alone don't grant access — Postgres checks table-level
-- privileges first. Without this, every query 42501s with "permission
-- denied for table staff_members" before any policy is even evaluated.
-- service_role bypasses RLS but NOT this base grant check, so it needs
-- its own explicit grant too (admin.createUser-style backend writes that
-- insert the staff_members row go through this).
grant select on public.staff_members to authenticated;
grant select, insert, update, delete on public.staff_members to service_role;

create policy "Staff can view their own record"
  on public.staff_members for select
  using (auth.uid() = user_id);
