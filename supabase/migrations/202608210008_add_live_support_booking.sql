alter table public.support_conversations
  add column if not exists booking_id uuid
    references public.bookings (id) on delete set null;

create index if not exists support_conversations_booking_id_idx
  on public.support_conversations (booking_id);
