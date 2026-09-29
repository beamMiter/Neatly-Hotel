-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- `0001_profiles.sql` enabled RLS and added view/update-own-profile
-- policies, but never granted the underlying table-level privileges —
-- RLS is only evaluated after the base grant check passes. This affects
-- BOTH roles:
--   - `authenticated` (a logged-in user reading/updating their own row)
--   - `service_role` (the admin client register's route.ts uses to
--     insert the row on signup — `supabaseAdmin.from("profiles").insert()`
--     bypasses RLS but NOT this base grant, so it would 42501 the same
--     way if it hasn't already; service_role has no grants on `profiles`
--     at all right now)
-- Same class of gap as `0002_rooms.sql`'s room_images fix and
-- `0003_staff_members.sql`.

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
