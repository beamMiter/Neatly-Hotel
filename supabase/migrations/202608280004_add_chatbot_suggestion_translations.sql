alter table public.chatbot_suggestions
  add column if not exists translations jsonb not null default '{}'::jsonb;

update public.chatbot_suggestions
set translations = case
  when translations = '{}'::jsonb then jsonb_build_object(
    'en', jsonb_build_object(
      'topic', topic,
      'reply', reply,
      'button_name', button_name,
      'options', options
    )
  )
  else translations
end;
