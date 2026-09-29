create table if not exists public.chatbot_interaction_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null check (char_length(request_id) between 1 and 100),
  event_type text not null check (event_type in ('response', 'handoff')),
  intent text not null check (intent in ('faq', 'search_room', 'unknown')),
  response_mode text not null check (response_mode in ('managed_suggestion', 'managed_faq', 'gemini', 'gemini_fallback', 'demo')),
  fallback_reason text,
  handoff_reason text,
  created_at timestamptz not null default now()
);

create index if not exists chatbot_interaction_events_created_at_idx
  on public.chatbot_interaction_events (created_at desc);

create index if not exists chatbot_interaction_events_outcome_idx
  on public.chatbot_interaction_events (event_type, intent, created_at desc);

alter table public.chatbot_interaction_events enable row level security;
revoke all on public.chatbot_interaction_events from anon, authenticated;
grant all on public.chatbot_interaction_events to service_role;
