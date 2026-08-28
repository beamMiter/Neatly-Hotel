-- Minimal chatbot settings schema for the current intent + fallback flow.
-- Managed FAQs were removed from the product, so this migration intentionally
-- creates only the single settings row used by Chatbot Setup and the widget.

create table if not exists public.chatbot_settings (
  id boolean primary key default true check (id),
  greeting_message text not null check (char_length(greeting_message) between 3 and 2000),
  auto_reply_message text not null check (char_length(auto_reply_message) between 3 and 2000),
  updated_at timestamptz not null default now()
);

alter table public.chatbot_settings enable row level security;

revoke all on public.chatbot_settings from anon, authenticated;
grant select on public.chatbot_settings to anon, authenticated;

drop policy if exists "Chatbot settings are public" on public.chatbot_settings;
create policy "Chatbot settings are public"
on public.chatbot_settings for select to anon, authenticated
using (true);

insert into public.chatbot_settings (id, greeting_message, auto_reply_message)
values (
  true,
  'Welcome to Neatly Hotel!',
  'ขออภัยค่ะ ฉันยังไม่มีข้อมูลสำหรับคำถามนี้'
)
on conflict (id) do nothing;
