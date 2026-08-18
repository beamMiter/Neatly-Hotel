-- Additive SQL for existing Supabase schema. Do not recreate rooms.

create table if not exists hotel_information (
  id text primary key,
  name text not null,
  description text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
