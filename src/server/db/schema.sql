-- Reference SQL for future Supabase deploy (cloud phase).
-- Local dev uses Prisma + SQLite — run `npm run db:setup` instead.

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_no varchar(16) not null unique,
  room_type varchar(100) not null,
  bed_type varchar(50) not null,
  status varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_status_idx on rooms (status);
create index if not exists rooms_room_no_idx on rooms (room_no);
