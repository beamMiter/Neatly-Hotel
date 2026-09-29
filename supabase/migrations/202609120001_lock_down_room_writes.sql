-- Room/property writes now go through staff-authorized server routes that use
-- the service-role client. Remove the legacy public INSERT access that was
-- added before the admin area had authentication.

revoke insert, update, delete on public.room_types from anon, authenticated;
revoke insert, update, delete on public.room_images from anon, authenticated;

drop policy if exists "Room types are publicly insertable" on public.room_types;
drop policy if exists "Room images are publicly insertable" on public.room_images;
drop policy if exists "Room image files are publicly insertable" on storage.objects;

-- Keep server-side management working explicitly. Public reads are left as-is.
grant select, insert, update, delete on public.room_types to service_role;
grant select, insert, update, delete on public.room_images to service_role;

