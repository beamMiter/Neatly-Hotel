-- Make Prisma writes to public.rooms visible to Supabase Realtime clients.
-- The block is idempotent so it is safe to run after the table has already
-- been enabled from the Supabase dashboard.

alter table public.rooms replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;
