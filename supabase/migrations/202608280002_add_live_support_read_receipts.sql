-- Track when each support agent last read a conversation.
-- This keeps unread indicators personal to the signed-in admin.
create table if not exists public.support_conversation_read_receipts (
  conversation_id uuid not null references public.support_conversations (id) on delete cascade,
  admin_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, admin_id)
);

create index if not exists support_conversation_read_receipts_admin_idx
  on public.support_conversation_read_receipts (admin_id, last_read_at desc);

alter table public.support_conversation_read_receipts enable row level security;
revoke all on public.support_conversation_read_receipts from anon, authenticated;
