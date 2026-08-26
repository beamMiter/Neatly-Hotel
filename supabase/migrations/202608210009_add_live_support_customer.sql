alter table public.support_conversations
  add column if not exists customer_id uuid
    references auth.users (id) on delete set null;

create index if not exists support_conversations_customer_id_idx
  on public.support_conversations (customer_id);
