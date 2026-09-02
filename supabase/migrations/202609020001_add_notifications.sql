-- Per-customer notifications for booking actions (confirmed, cancelled,
-- refunded, date changed). Scoped narrow on purpose — not a generic
-- event-log table for every action in the app.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_customer_idx
  on public.notifications (customer_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
