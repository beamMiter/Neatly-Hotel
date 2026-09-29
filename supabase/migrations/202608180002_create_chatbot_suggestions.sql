create table if not exists public.chatbot_suggestions (
  id text primary key,
  topic text not null check (length(trim(topic)) > 0),
  format text not null check (format in ('Room type', 'Message', 'Option with details')),
  reply text not null check (length(trim(reply)) > 0),
  button_name text,
  rooms text[] not null default '{}',
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_chatbot_suggestions_updated_at on public.chatbot_suggestions;
create trigger set_chatbot_suggestions_updated_at
before update on public.chatbot_suggestions
for each row execute function public.set_chatbot_faq_updated_at();

alter table public.chatbot_suggestions enable row level security;

drop policy if exists "Public can read active chatbot suggestions" on public.chatbot_suggestions;
create policy "Public can read active chatbot suggestions"
on public.chatbot_suggestions for select
using (is_active = true or public.is_chatbot_admin());

drop policy if exists "Chatbot admins can insert suggestions" on public.chatbot_suggestions;
create policy "Chatbot admins can insert suggestions"
on public.chatbot_suggestions for insert
with check (public.is_chatbot_admin());

drop policy if exists "Chatbot admins can update suggestions" on public.chatbot_suggestions;
create policy "Chatbot admins can update suggestions"
on public.chatbot_suggestions for update
using (public.is_chatbot_admin()) with check (public.is_chatbot_admin());

drop policy if exists "Chatbot admins can delete suggestions" on public.chatbot_suggestions;
create policy "Chatbot admins can delete suggestions"
on public.chatbot_suggestions for delete
using (public.is_chatbot_admin());

insert into public.chatbot_suggestions (id, topic, format, reply, button_name, rooms, options, sort_order)
values
  ('room-types', 'Room Types', 'Room type', 'Neatly Hotel offers a variety of room types to suit your needs! Here are the options.', 'View Details', array['Superior Garden View','Deluxe','Superior','Supreme'], '[]', 0),
  ('booking', 'Booking', 'Room type', 'Let''s get your booking started. First, please choose the type of room you''d like.', 'Book Now', array['Superior Garden View','Deluxe','Superior','Supreme'], '[]', 1),
  ('check-times', 'Check-in & Check-out Time', 'Message', E'Great! Here are our check-in and check-out times:\nCheck-in time: From 2:00 PM onwards\nCheck-out time: By 12:00 PM', null, '{}', '[]', 2),
  ('payment', 'Payment Methods', 'Option with details', 'Here are the payment methods we accept. Tap to see more details.', null, '{}', '[{"name":"Credit Card","details":"We accept credit cards including Visa and MasterCard."},{"name":"Cash","details":"You can pay at the hotel with cash or cheque. No payment is required until check-in."}]', 3),
  ('promotion', 'Promotion', 'Room type', 'Our promotion this month: get 10% off when you book your stay within this month.', 'Book Now', array['Superior Garden View','Deluxe','Superior','Supreme'], '[]', 4)
on conflict (id) do nothing;
