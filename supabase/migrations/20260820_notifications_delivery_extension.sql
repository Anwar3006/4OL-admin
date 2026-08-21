-- =============================================================================
-- Notifications delivery tracking extension (Gap Analysis Part R).
--
-- Closes R1 (no delivery/open tracking) and adds the pharmacy geo-marketing
-- model. Decisions: R-D1 (live RPC over opened_at, NOT Epic 30.1
-- analytics_events), R-D2 (Best Time fed by get_best_time_stats).
-- Additive and re-runnable. Reconcile against full-tables.sql before apply.
-- =============================================================================

-- 1. Delivery tracking on notifications ---------------------------------------
-- channel: push|whatsapp (Part T makes whatsapp the second channel).
-- opened_at backfilled from read_at for historical rows.
alter table public.notifications
  add column if not exists channel text not null default 'push' check (channel in ('push', 'whatsapp')),
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists sent_by uuid references public.user_profiles (user_id);

update public.notifications
   set opened_at = read_at
 where opened_at is null and read_at is not null;

create index if not exists idx_notifications_channel_created on public.notifications (channel, created_at desc);

-- 2. Campaign ownership + lifecycle -------------------------------------------
alter table public.notification_campaigns
  add column if not exists created_by uuid references public.user_profiles (user_id),
  add column if not exists status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed'));

-- 3. Pharmacy geo-marketing campaigns ------------------------------------------
-- Radius-based discount/health campaigns around a pharmacy (mockup Pharmacy
-- Marketing tab: 0.5 / 2 / 5 km radius picker + 4-rule compliance footer).
create table if not exists public.pharmacy_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.facility_profile (id),
  name text not null,
  message text not null,
  radius_km numeric(4, 2) not null default 2 check (radius_km in (0.5, 2, 5)),
  audience_count integer,
  channel text not null default 'push' check (channel in ('push', 'whatsapp')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'paused')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivery_stats jsonb not null default '{}'::jsonb,
  created_by uuid references public.user_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pharmacy_marketing_campaigns enable row level security;

-- 4. Analytics RPCs ------------------------------------------------------------
-- Superset of the Epic 27 get_notification_analytics(time_filter) shape —
-- keeps every existing key (notifications.total/read/broadcasts,
-- campaigns.total/sent/scheduled/failed/pending_approval, templates,
-- automation_rules) and adds delivery counters (opened/delivered/by_channel)
-- for Part R's All Log + KPI rows.
create or replace function public.get_notification_analytics(time_filter text default '30')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_days int;
  v_window timestamptz;
begin
  if time_filter is null or time_filter in ('', 'all') then
    v_window := null;
  else
    v_days := greatest(coalesce(nullif(regexp_replace(time_filter, '[^0-9]', '', 'g'), '')::int, 30), 1);
    v_window := now() - (v_days || ' days')::interval;
  end if;

  return jsonb_build_object(
    'notifications', jsonb_build_object(
      'total', (select count(*) from public.notifications where v_window is null or created_at >= v_window),
      'read', (select count(*) from public.notifications where is_read = true and (v_window is null or created_at >= v_window)),
      'opened', (select count(*) from public.notifications where opened_at is not null and (v_window is null or created_at >= v_window)),
      'delivered', (select count(*) from public.notifications where delivered_at is not null and (v_window is null or created_at >= v_window)),
      'broadcasts', (select count(*) from public.notifications where is_broadcast = true and (v_window is null or created_at >= v_window)),
      'by_channel', (
        select coalesce(jsonb_object_agg(channel, n), '{}'::jsonb)
        from (select channel, count(*) as n from public.notifications where v_window is null or created_at >= v_window group by channel) c
      )
    ),
    'campaigns', jsonb_build_object(
      'total', (select count(*) from public.notification_campaigns where v_window is null or created_at >= v_window),
      'sent', (select count(*) from public.notification_campaigns where sent_at is not null and (v_window is null or created_at >= v_window)),
      'scheduled', (select count(*) from public.notification_campaigns where sent_at is null and scheduled_at is not null and scheduled_at > now()),
      'failed', (select count(*) from public.notification_campaigns where failed_at is not null and (v_window is null or created_at >= v_window)),
      'pending_approval', (select count(*) from public.notification_campaigns where approval_status = 'pending_approval')
    ),
    'templates', jsonb_build_object(
      'total', (select count(*) from public.notification_templates),
      'active', (select count(*) from public.notification_templates where is_active = true)
    ),
    'automation_rules', jsonb_build_object(
      'total', (select count(*) from public.notification_automation_rules),
      'active', (select count(*) from public.notification_automation_rules where is_active = true)
    )
  );
end;
$function$;

-- Best-time-to-send heatmap: opened counts bucketed by hour-of-day and a
-- coarse segment (broadcast vs campaign vs transactional via is_broadcast /
-- campaign_id). Live query over opened_at per R-D1/R-D2.
create or replace function public.get_best_time_stats()
returns table (hour_bucket integer, segment text, opened_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    extract(hour from opened_at)::integer as hour_bucket,
    case
      when is_broadcast then 'broadcast'
      when campaign_id is not null then 'campaign'
      else 'transactional'
    end as segment,
    count(*) as opened_count
  from public.notifications
  where opened_at is not null
    and opened_at >= now() - interval '90 days'
  group by 1, 2
  order by 1, 2;
$$;

revoke all on function public.get_notification_analytics(text) from public, anon, authenticated;
revoke all on function public.get_best_time_stats() from public, anon, authenticated;
grant execute on function public.get_notification_analytics(text) to service_role;
grant execute on function public.get_best_time_stats() to service_role;

-- 5. Log export view (R-D7: CSV export respects the same columns as All Log) ---
create or replace view public.notification_log_export as
select
  n.id,
  n.title,
  n.body,
  n.type,
  n.channel,
  n.is_broadcast,
  n.is_read,
  n.delivered_at,
  n.opened_at,
  n.sent_by,
  n.campaign_id,
  n.created_at
from public.notifications n;


