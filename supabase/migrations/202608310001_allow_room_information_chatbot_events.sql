alter table public.chatbot_interaction_events
  drop constraint if exists chatbot_interaction_events_response_mode_check;

alter table public.chatbot_interaction_events
  add constraint chatbot_interaction_events_response_mode_check
  check (
    response_mode in (
      'managed_suggestion',
      'managed_faq',
      'room_information',
      'gemini',
      'gemini_fallback',
      'demo'
    )
  );
