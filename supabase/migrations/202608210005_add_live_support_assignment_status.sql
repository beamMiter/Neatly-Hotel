alter table public.support_conversations
  drop constraint if exists support_conversations_status_check;

update public.support_conversations
set status = 'waiting'
where status = 'open';

alter table public.support_conversations
  alter column status set default 'waiting',
  add constraint support_conversations_status_check
    check (status in ('waiting', 'active', 'resolved'));
