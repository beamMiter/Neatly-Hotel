alter table public.chatbot_settings
  add column if not exists greeting_message_th text,
  add column if not exists greeting_message_en text,
  add column if not exists auto_reply_message_th text,
  add column if not exists auto_reply_message_en text;

update public.chatbot_settings
set greeting_message_th = coalesce(nullif(greeting_message_th, ''), 'สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel!'),
    greeting_message_en = coalesce(nullif(greeting_message_en, ''), greeting_message, 'Welcome to Neatly Hotel!'),
    auto_reply_message_th = coalesce(nullif(auto_reply_message_th, ''), auto_reply_message, 'ขออภัยค่ะ ฉันยังไม่มีข้อมูลสำหรับคำถามนี้'),
    auto_reply_message_en = coalesce(nullif(auto_reply_message_en, ''), 'Sorry, I do not have confirmed information for this question yet.');

alter table public.chatbot_settings
  alter column greeting_message_th set not null,
  alter column greeting_message_en set not null,
  alter column auto_reply_message_th set not null,
  alter column auto_reply_message_en set not null;
