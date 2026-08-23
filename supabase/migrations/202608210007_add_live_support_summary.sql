alter table public.support_conversations
  add column if not exists summary text,
  add column if not exists summary_generated_at timestamptz;
