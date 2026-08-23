create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token uuid not null unique,
  customer_name text,
  customer_phone text,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'resolved')),
  topic text not null default 'other' check (topic in ('booking', 'room', 'payment', 'other')),
  assigned_agent_id uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  summary text,
  summary_generated_at timestamptz
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations (id) on delete cascade,
  sender text not null check (sender in ('visitor', 'agent', 'system')),
  sender_name text,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_conversations_status_last_message_idx
  on public.support_conversations (status, last_message_at desc);

create index if not exists support_messages_conversation_created_idx
  on public.support_messages (conversation_id, created_at);

create or replace function public.refresh_support_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_conversations
  set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists refresh_support_conversation_activity on public.support_messages;
create trigger refresh_support_conversation_activity
after insert on public.support_messages
for each row execute function public.refresh_support_conversation_activity();

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

revoke all on public.support_conversations from anon, authenticated;
revoke all on public.support_messages from anon, authenticated;
