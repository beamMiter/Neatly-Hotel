-- Supports the admin Analytics Dashboard:
--   1. bookings.check_in/check_out are reservation DATEs, not the time staff
--      actually performed the check-in/check-out action, so there was no way
--      to compute "average check-in/check-out time". These two columns
--      record that moment going forward (existing bookings stay null; there
--      was never a timestamp to backfill from).
--   2. page_views is new: a minimal, admin-only visitor/traffic log written
--      by src/proxy.ts on every real page navigation, read only by the
--      dashboard's site-traffic widgets.
--
-- Apply once:
--   npm run db:apply-analytics-tracking
-- or paste into Supabase SQL Editor.

alter table bookings add column if not exists checked_in_at timestamptz;
alter table bookings add column if not exists checked_out_at timestamptz;

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  visitor_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_visitor_id_idx on page_views (visitor_id);

-- RLS on with no policies: only the service-role (admin) client can read or
-- write this table, matching how the proxy writes it and the dashboard
-- reads it — no anon/authenticated access is needed at all.
alter table page_views enable row level security;
