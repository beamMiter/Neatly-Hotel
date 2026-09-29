-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- Migrates databases that ran an earlier 0003 (which allowed `agent` and
-- `admin`) to the single-tier model: only `admin` is valid. The app
-- recognises two account kinds — a customer (no staff_members row) and an
-- admin (a row with role = 'admin').
--
-- Safe to re-run: updates legacy `agent` rows, then enforces admin-only.

-- Legacy front-counter rows become admins under the simplified model.
update public.staff_members set role = 'admin' where role = 'agent';

alter table public.staff_members
  drop constraint if exists staff_members_role_check;

alter table public.staff_members
  add constraint staff_members_role_check check (role in ('admin'));
