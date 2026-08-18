create table if not exists public.chatbot_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_faqs (
  id bigint primary key generated always as identity,
  question text not null check (char_length(question) between 3 and 300),
  answer text not null check (char_length(answer) between 3 and 2000),
  category text not null default 'general' check (char_length(category) between 1 and 80),
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_settings (
  id boolean primary key default true check (id),
  greeting_message text not null check (char_length(greeting_message) between 3 and 2000),
  auto_reply_message text not null check (char_length(auto_reply_message) between 3 and 2000),
  updated_at timestamptz not null default now()
);

create index if not exists chatbot_faqs_active_sort_idx
  on public.chatbot_faqs (is_active, sort_order, id);

create or replace function public.is_chatbot_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chatbot_admins
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.set_chatbot_faq_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chatbot_faq_updated_at on public.chatbot_faqs;
create trigger set_chatbot_faq_updated_at
before update on public.chatbot_faqs
for each row execute function public.set_chatbot_faq_updated_at();

drop trigger if exists set_chatbot_settings_updated_at on public.chatbot_settings;
create trigger set_chatbot_settings_updated_at
before update on public.chatbot_settings
for each row execute function public.set_chatbot_faq_updated_at();

alter table public.chatbot_admins enable row level security;
alter table public.chatbot_faqs enable row level security;
alter table public.chatbot_settings enable row level security;

revoke all on public.chatbot_admins from anon, authenticated;
revoke all on public.chatbot_faqs from anon, authenticated;
revoke all on public.chatbot_settings from anon, authenticated;
grant select on public.chatbot_admins to authenticated;
grant select on public.chatbot_faqs to anon, authenticated;
grant insert, update, delete on public.chatbot_faqs to authenticated;
grant select on public.chatbot_settings to anon, authenticated;
grant update on public.chatbot_settings to authenticated;
grant usage, select on sequence public.chatbot_faqs_id_seq to authenticated;
grant execute on function public.is_chatbot_admin() to anon, authenticated;

drop policy if exists "Admins can view own membership" on public.chatbot_admins;
create policy "Admins can view own membership"
on public.chatbot_admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Published FAQs are public" on public.chatbot_faqs;
create policy "Published FAQs are public"
on public.chatbot_faqs for select to anon, authenticated
using (is_active or (select public.is_chatbot_admin()));

drop policy if exists "Admins can create FAQs" on public.chatbot_faqs;
create policy "Admins can create FAQs"
on public.chatbot_faqs for insert to authenticated
with check ((select public.is_chatbot_admin()));

drop policy if exists "Admins can update FAQs" on public.chatbot_faqs;
create policy "Admins can update FAQs"
on public.chatbot_faqs for update to authenticated
using ((select public.is_chatbot_admin()))
with check ((select public.is_chatbot_admin()));

drop policy if exists "Admins can delete FAQs" on public.chatbot_faqs;
create policy "Admins can delete FAQs"
on public.chatbot_faqs for delete to authenticated
using ((select public.is_chatbot_admin()));

drop policy if exists "Chatbot settings are public" on public.chatbot_settings;
create policy "Chatbot settings are public"
on public.chatbot_settings for select to anon, authenticated
using (true);

drop policy if exists "Admins can update chatbot settings" on public.chatbot_settings;
create policy "Admins can update chatbot settings"
on public.chatbot_settings for update to authenticated
using ((select public.is_chatbot_admin()))
with check ((select public.is_chatbot_admin()));

insert into public.chatbot_settings (id, greeting_message, auto_reply_message)
values (
  true,
  E'Welcome to Neatly Hotel! 🌟\nI’m your virtual assistant.\nChoose a topic you’d like to know more about. I’m here to help! 😊',
  'ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม รบกวนอธิบายเพิ่มเติม หรือเลือกหัวข้อที่แนะนำได้เลยค่ะ'
)
on conflict (id) do nothing;

insert into public.chatbot_faqs (question, answer, category, keywords, sort_order)
select * from (values
  ('เวลาเช็กอินและเช็กเอาต์คือกี่โมง', 'เวลาเช็กอินมาตรฐานคือ 14:00 น. และเช็กเอาต์ภายใน 12:00 น. หากต้องการเข้าพักก่อนเวลา กรุณาแจ้งล่วงหน้าเพื่อให้เจ้าหน้าที่ตรวจสอบค่ะ', 'การเข้าพัก', array['เช็กอิน','เช็กเอาต์','check-in','check-out'], 10),
  ('โรงแรมมีสิ่งอำนวยความสะดวกอะไรบ้าง', 'Neatly Hotel มี Wi‑Fi ฟรี ที่จอดรถ อาหารเช้า และบริการทำความสะอาดรายวันค่ะ หากต้องการสอบถามบริการเฉพาะ แจ้งมาได้เลยนะคะ', 'บริการ', array['wifi','อาหารเช้า','ที่จอดรถ','สิ่งอำนวยความสะดวก'], 20),
  ('ติดต่อโรงแรมได้อย่างไร', 'กรุณาฝากชื่อและช่องทางติดต่อไว้ เจ้าหน้าที่ของโรงแรมจะติดต่อกลับโดยเร็วที่สุดค่ะ', 'ติดต่อ', array['ติดต่อ','โทร','เบอร์','อีเมล'], 30)
) as seed(question, answer, category, keywords, sort_order)
where not exists (select 1 from public.chatbot_faqs);

-- หลังสร้างผู้ใช้ใน Authentication > Users ให้รันคำสั่งนี้หนึ่งครั้ง:
-- insert into public.chatbot_admins (user_id)
-- select id from auth.users where email = 'admin@example.com';
