-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- Collapses the staff role model down to a single `admin` tier. The role
-- split shipped in 0003 (`agent` = front-counter, `admin` = broader
-- permissions) never got authorization built on top of it, and the app now
-- recognises exactly two kinds of account: a customer (no staff_members
-- row) and an admin (a row with role = 'admin').
--
-- 0003 is left as-is on purpose: it already ran against every existing
-- database, and its `create table if not exists` means editing it in place
-- would change nothing. This migration does the change as a real ALTER.

-- Any rows created before this point are front-counter staff, which the
-- new model treats as plain admins.
update public.staff_members set role = 'admin' where role = 'agent';

alter table public.staff_members
  drop constraint if exists staff_members_role_check;

alter table public.staff_members
  add constraint staff_members_role_check check (role in ('admin'));
