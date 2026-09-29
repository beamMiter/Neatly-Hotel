alter table public.support_conversations
  add column if not exists customer_phone text;

alter table public.support_conversations
  drop constraint if exists support_conversations_customer_phone_check;

alter table public.support_conversations
  add constraint support_conversations_customer_phone_check
    check (
      customer_phone is null
      or char_length(regexp_replace(customer_phone, '\\D', '', 'g')) between 7 and 15
    );
