-- Email OTP codes for guest booking verification.
-- Codes are stored hashed; plaintext never persists.
--
-- Apply once:
--   npm run db:apply-email-otp
-- or paste into Supabase SQL Editor.
--
-- Do not run prisma migrate/db:push against the shared DB without the team.

create table if not exists email_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists email_otps_email_created_at_idx
  on email_otps (email, created_at desc);

comment on table email_otps is
  'One-time email verification codes for guest checkout. Lookup by email; only the latest unconsumed, unexpired row should be verified.';

-- service_role only — never expose OTP rows to anon/authenticated clients.
alter table email_otps enable row level security;
grant select, insert, update, delete on public.email_otps to service_role;
