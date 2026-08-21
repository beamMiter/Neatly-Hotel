-- Promotion codes for booking discount validation (customer Step 3 / API).
-- Apply only after team approval (shared Supabase Postgres).
-- Example (when approved):
--   npm run db:apply-promo

create table if not exists public.promotion_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_subtotal numeric,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  -- empty array = applies to every room type
  applicable_room_type_ids uuid[] not null default '{}',
  max_uses int,
  used_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_codes_code_unique unique (code),
  constraint promotion_codes_percent_max check (
    discount_type <> 'percent' or discount_value <= 100
  ),
  constraint promotion_codes_date_range check (
    valid_from is null or valid_to is null or valid_from <= valid_to
  ),
  constraint promotion_codes_max_uses_nonneg check (
    max_uses is null or max_uses >= 0
  ),
  constraint promotion_codes_used_count_nonneg check (used_count >= 0)
);

create index if not exists promotion_codes_code_idx
  on public.promotion_codes (code);

create index if not exists promotion_codes_active_idx
  on public.promotion_codes (is_active);

-- Sample codes for local / shared testing (safe to re-run)
insert into public.promotion_codes (
  code,
  discount_type,
  discount_value,
  min_subtotal,
  valid_from,
  valid_to,
  is_active,
  applicable_room_type_ids,
  max_uses,
  used_count
)
values
  (
    'NEATLY10',
    'percent',
    10,
    null,
    null,
    null,
    true,
    '{}',
    null,
    0
  ),
  (
    'SAVE400',
    'fixed',
    400,
    1500,
    null,
    null,
    true,
    '{}',
    null,
    0
  ),
  (
    'EXPIRED',
    'percent',
    20,
    null,
    '2020-01-01',
    '2020-12-31',
    true,
    '{}',
    null,
    0
  )
on conflict (code) do nothing;
