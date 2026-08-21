-- Chatbot management uses the existing back-office admin role.
-- Keep chatbot_admins for backwards compatibility, but do not require a
-- second membership row for chatbot access.
create or replace function public.is_chatbot_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_chatbot_admin() to anon, authenticated;
