-- Live Support retention policy
-- - Messages: 180 days
-- - Guest phone on a support conversation: 180 days
-- - Resolved AI summaries: 1 year
-- - Conversations without a booking or summary: 180 days of inactivity

create extension if not exists pg_cron;

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at);

create index if not exists support_conversations_retention_cleanup_idx
  on public.support_conversations (last_message_at)
  where booking_id is null and summary is null;

create index if not exists support_conversations_summary_retention_idx
  on public.support_conversations (resolved_at)
  where summary is not null;

create or replace function public.cleanup_live_support_retention()
returns table (
  deleted_messages bigint,
  anonymized_guest_phones bigint,
  deleted_summaries bigint,
  deleted_conversations bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_count bigint := 0;
  phone_count bigint := 0;
  summary_count bigint := 0;
  conversation_count bigint := 0;
begin
  delete from public.support_messages
  where created_at < now() - interval '180 days';
  get diagnostics message_count = row_count;

  -- Booking records keep their own guest contact details. Remove the duplicate
  -- contact value from old guest support conversations regardless of booking status.
  update public.support_conversations
  set customer_phone = null,
      updated_at = now()
  where customer_id is null
    and customer_phone is not null
    and last_message_at < now() - interval '180 days';
  get diagnostics phone_count = row_count;

  update public.support_conversations
  set summary = null,
      summary_generated_at = null,
      updated_at = now()
  where summary is not null
    and resolved_at is not null
    and resolved_at < now() - interval '1 year';
  get diagnostics summary_count = row_count;

  -- Deleting a conversation also removes any remaining messages through the
  -- foreign-key cascade. Bookings themselves are never deleted by this job.
  delete from public.support_conversations
  where booking_id is null
    and summary is null
    and last_message_at < now() - interval '180 days';
  get diagnostics conversation_count = row_count;

  return query select message_count, phone_count, summary_count, conversation_count;
end;
$$;

revoke all on function public.cleanup_live_support_retention() from public, anon, authenticated;
grant execute on function public.cleanup_live_support_retention() to service_role;

-- Supabase Cron evaluates this schedule in UTC: 02:15 UTC = 09:15 Asia/Bangkok.
select cron.unschedule(jobid)
from cron.job
where jobname = 'live-support-retention-daily';

select cron.schedule(
  'live-support-retention-daily',
  '15 2 * * *',
  'select public.cleanup_live_support_retention();'
);
