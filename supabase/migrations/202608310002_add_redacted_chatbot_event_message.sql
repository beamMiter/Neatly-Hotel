alter table public.chatbot_interaction_events
  add column if not exists message_redacted text;

alter table public.chatbot_interaction_events
  drop constraint if exists chatbot_interaction_events_message_redacted_length_check;

alter table public.chatbot_interaction_events
  add constraint chatbot_interaction_events_message_redacted_length_check
  check (message_redacted is null or char_length(message_redacted) <= 450);

comment on column public.chatbot_interaction_events.message_redacted is
  'Latest visitor message after email, phone number, and booking-code redaction; used to review routing and handoff patterns.';

create index if not exists chatbot_interaction_events_handoff_reason_idx
  on public.chatbot_interaction_events (handoff_reason, created_at desc)
  where handoff_reason is not null;
