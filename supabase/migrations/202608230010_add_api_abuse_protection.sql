create table if not exists public.api_rate_limits (
  key_hash text primary key check (char_length(key_hash) = 64),
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  counter public.api_rate_limits%rowtype;
begin
  if char_length(p_key_hash) <> 64 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into public.api_rate_limits as limits (
    key_hash,
    request_count,
    window_started_at,
    expires_at
  )
  values (
    p_key_hash,
    1,
    v_now,
    v_now + make_interval(secs => p_window_seconds)
  )
  on conflict (key_hash) do update
  set request_count = case
        when limits.expires_at <= v_now then 1
        else least(limits.request_count + 1, p_limit + 1)
      end,
      window_started_at = case
        when limits.expires_at <= v_now then v_now
        else limits.window_started_at
      end,
      expires_at = case
        when limits.expires_at <= v_now
          then v_now + make_interval(secs => p_window_seconds)
        else limits.expires_at
      end
  returning * into counter;

  allowed := counter.request_count <= p_limit;
  remaining := greatest(0, p_limit - counter.request_count);
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from counter.expires_at - v_now))::integer)
  end;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

create or replace function public.add_visitor_support_message(
  p_conversation_id uuid,
  p_content text,
  p_max_messages integer
)
returns public.support_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_count integer;
  inserted_message public.support_messages%rowtype;
begin
  if p_max_messages < 1 or char_length(trim(p_content)) not between 1 and 2000 then
    raise exception 'invalid support message';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text, 0));

  select count(*)
  into message_count
  from public.support_messages
  where conversation_id = p_conversation_id;

  if message_count >= p_max_messages then
    raise exception using
      errcode = 'P0001',
      message = 'support_message_limit_reached';
  end if;

  insert into public.support_messages (conversation_id, sender, content)
  values (p_conversation_id, 'visitor', trim(p_content))
  returning * into inserted_message;

  return inserted_message;
end;
$$;

revoke all on function public.add_visitor_support_message(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.add_visitor_support_message(uuid, text, integer) to service_role;
