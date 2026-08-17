-- =============================================================================
-- Epic 27 — Notifications & Campaigns (reconciled schema)
--
-- This is the checked-in reconciliation of migration
-- 20260813143810_epic27_notifications_campaigns, which was built and applied
-- live against the Supabase project via the MCP connector (see TASKS.md,
-- Epic 27). The file previously committed here was a placeholder; this
-- version reproduces the applied schema so a fresh `supabase db push` /
-- migration run converges on live state.
--
-- Scope:
--   * Tables: notification_templates, notification_automation_rules,
--     notification_campaigns (+ approval workflow columns),
--     notification_delivery_receipts, and additive columns on the
--     pre-existing `notifications` table (campaign_id / is_broadcast /
--     read_at).
--   * RPCs: resolve_notification_segment, get_notification_segment_count,
--     dispatch_notification, send_notification_campaign,
--     send_due_notification_campaigns, reconcile_notification_receipts,
--     get_notification_analytics.
--   * Push delivery goes through Expo (https://exp.host/--/api/v2/push/send)
--     via pg_net; per-recipient tickets land in
--     notification_delivery_receipts and are reconciled by a cron job that
--     also nulls dead expo_push_tokens on DeviceNotRegistered.
--   * Security: the four action/write RPCs are service_role-only; the three
--     read/preview RPCs are authenticated + service_role (mirrors the live
--     lock_down_epic27_notification_function_grants fix). The admin-managed
--     tables get RLS with no client policies — all access flows through
--     service-role route handlers.
--
-- Additive and re-runnable: IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT.
-- NOTE: pg_net's public net.http_collect_response() wrapper is broken in this
-- project (42601 — query has no destination for result data); code here
-- calls net._http_collect_response() directly, as verified live.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------
create table if not exists public.notification_templates (
  id uuid not null default gen_random_uuid(),
  name text not null,
  template_type text not null check (template_type in ('sms', 'push', 'email', 'whatsapp')),
  subject text,
  body text not null,
  source_module text not null,
  variables jsonb default '[]'::jsonb,
  usage_count integer default 0,
  last_used_at timestamptz,
  is_active boolean default true,
  created_by uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_pkey primary key (id)
);

create table if not exists public.notification_automation_rules (
  id uuid not null default gen_random_uuid(),
  name text not null,
  trigger_event text not null,
  source_module text not null,
  channel text[] default '{}'::text[],
  target_audience text,
  condition_json jsonb default '{}'::jsonb,
  template_id uuid references public.notification_templates(id),
  is_active boolean default true,
  last_fired_at timestamptz,
  fire_count integer default 0,
  created_by uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  constraint notification_automation_rules_pkey primary key (id)
);

create table if not exists public.notification_campaigns (
  id uuid not null default gen_random_uuid(),
  template_id uuid references public.notification_templates(id),
  title text not null,
  body text not null,
  type text not null,
  metadata jsonb default '{}'::jsonb,
  segment_filter jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  delivery_stats jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notification_campaigns_pkey primary key (id)
);

-- Approval-workflow columns (added live with Epic 27.3; additive here so the
-- migration also converges pre-27 databases).
alter table public.notification_campaigns
  add column if not exists created_by uuid references public.user_profiles(user_id),
  add column if not exists approval_status text not null default 'draft',
  add column if not exists submitted_for_approval_at timestamptz,
  add column if not exists approved_by uuid references public.user_profiles(user_id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notification_campaigns
  drop constraint if exists notification_campaigns_approval_status_check;
alter table public.notification_campaigns
  add constraint notification_campaigns_approval_status_check
  check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected'));

-- Pre-existing notifications log: add the Epic 27 columns if absent.
alter table public.notifications
  add column if not exists campaign_id uuid,
  add column if not exists is_broadcast boolean default false,
  add column if not exists read_at timestamptz;

-- Per-recipient Expo delivery tickets.
create table if not exists public.notification_delivery_receipts (
  id uuid not null default gen_random_uuid(),
  campaign_id uuid references public.notification_campaigns(id) on delete cascade,
  user_id uuid references public.user_profiles(user_id),
  notification_id uuid references public.notifications(id) on delete set null,
  channel text not null default 'push',
  send_status text not null default 'pending',
  receipt_status text,
  expo_ticket_id text,
  net_request_id bigint,
  expo_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_delivery_receipts_pkey primary key (id)
);

create index if not exists idx_notification_receipts_campaign
  on public.notification_delivery_receipts (campaign_id);
create index if not exists idx_notification_receipts_pending
  on public.notification_delivery_receipts (net_request_id)
  where receipt_status is null;
create index if not exists idx_notifications_campaign
  on public.notifications (campaign_id);
create index if not exists idx_notification_campaigns_approval
  on public.notification_campaigns (approval_status);

-- Late FK now that both tables exist (guarded: older DBs may already carry it).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_campaign_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_campaign_id_fkey
      foreign key (campaign_id) references public.notification_campaigns(id)
      on delete set null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Segment resolution
--    segment_filter shape: { audience: 'all_users' } or a targeted filter
--    { audience: 'targeted', user_type?, role?, sex?, status? } — each
--    targeted key is optional; omitted/empty keys don't constrain.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_notification_segment(p_segment_filter jsonb)
returns setof uuid
language sql
stable
set search_path = public
as $$
  select user_id
  from public.user_profiles
  where deleted_at is null
    and coalesce(nullif(p_segment_filter->>'user_type', ''), user_type) = user_type
    and coalesce(nullif(p_segment_filter->>'role', ''), role) = role
    and coalesce(nullif(p_segment_filter->>'sex', ''), sex) = sex
    and coalesce(nullif(p_segment_filter->>'status', ''), status) = status;
$$;

create or replace function public.get_notification_segment_count(p_segment_filter jsonb)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.resolve_notification_segment(coalesce(p_segment_filter, '{}'::jsonb));
$$;

-- -----------------------------------------------------------------------------
-- 3. Dispatch — one push to one user via Expo, recording a delivery receipt.
--    Returns the receipt id, or null when the user has no push token.
--    Degrades gracefully (receipt send_status = 'skipped_pg_net_unavailable')
--    when pg_net is not installed.
-- -----------------------------------------------------------------------------
create or replace function public.dispatch_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'system',
  p_metadata jsonb default '{}'::jsonb,
  p_campaign_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_token text;
  v_receipt_id uuid;
  v_request_id bigint;
  v_send_status text;
begin
  select expo_push_token into v_token
  from public.user_profiles
  where user_id = p_user_id and deleted_at is null;

  if v_token is null or v_token = '' then
    return null;
  end if;

  v_send_status := 'sent';
  v_request_id := null;

  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
    begin
      select net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := jsonb_build_object(
          'to', v_token,
          'title', p_title,
          'body', p_body,
          'sound', 'default',
          'data', coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
            'type', p_type,
            'campaign_id', p_campaign_id
          )
        ),
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
      ) into v_request_id;
    exception when others then
      v_send_status := 'failed';
    end;
  else
    v_send_status := 'skipped_pg_net_unavailable';
  end if;

  insert into public.notification_delivery_receipts (
    campaign_id, user_id, channel, send_status, net_request_id
  ) values (
    p_campaign_id, p_user_id, 'push', v_send_status, v_request_id
  )
  returning id into v_receipt_id;

  return v_receipt_id;
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Campaign send — fan a campaign out to its resolved segment.
-- -----------------------------------------------------------------------------
create or replace function public.send_notification_campaign(p_campaign_id uuid, p_admin_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_campaign record;
  v_targets uuid[];
  v_user_id uuid;
  v_push_attempted int := 0;
  v_metadata jsonb;
begin
  select id, title, body, type, metadata, segment_filter, template_id,
         approval_status, sent_at
  into v_campaign
  from public.notification_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign % not found', p_campaign_id;
  end if;
  if v_campaign.sent_at is not null then
    raise exception 'Campaign was already sent.';
  end if;
  if v_campaign.approval_status <> 'approved' then
    raise exception 'Campaign must be approved before it can be sent.';
  end if;

  v_metadata := coalesce(v_campaign.metadata, '{}'::jsonb) || jsonb_build_object('sent_by', p_admin_id);

  select array_agg(user_id) into v_targets
  from public.resolve_notification_segment(coalesce(v_campaign.segment_filter, '{"audience":"all_users"}'::jsonb));

  v_targets := coalesce(v_targets, '{}'::uuid[]);

  insert into public.notifications (user_id, title, body, type, metadata, is_broadcast, campaign_id)
  select t, v_campaign.title, v_campaign.body, v_campaign.type, v_metadata, true, v_campaign.id
  from unnest(v_targets) as t;

  for v_user_id in select unnest(v_targets)
  loop
    if public.dispatch_notification(
      p_user_id := v_user_id,
      p_title := v_campaign.title,
      p_body := v_campaign.body,
      p_type := v_campaign.type,
      p_metadata := v_metadata,
      p_campaign_id := v_campaign.id
    ) is not null then
      v_push_attempted := v_push_attempted + 1;
    end if;
  end loop;

  update public.notification_campaigns
  set sent_at = now(),
      delivery_stats = jsonb_build_object(
        'targeted', cardinality(v_targets),
        'notifications_created', cardinality(v_targets),
        'push_attempted', v_push_attempted,
        'sent_at', now()
      )
  where id = p_campaign_id;

  if v_campaign.template_id is not null then
    update public.notification_templates
    set usage_count = coalesce(usage_count, 0) + 1,
        last_used_at = now()
    where id = v_campaign.template_id;
  end if;

  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'targeted', cardinality(v_targets),
    'push_attempted', v_push_attempted
  );
end;
$function$;

-- Cron helper: send every approved campaign whose scheduled_at has passed.
create or replace function public.send_due_notification_campaigns()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_campaign record;
  v_sent int := 0;
  v_failed int := 0;
begin
  for v_campaign in
    select id from public.notification_campaigns
    where approval_status = 'approved'
      and sent_at is null
      and failed_at is null
      and scheduled_at is not null
      and scheduled_at <= now()
  loop
    begin
      perform public.send_notification_campaign(v_campaign.id, null);
      v_sent := v_sent + 1;
    exception when others then
      update public.notification_campaigns
      set failed_at = now(), failure_reason = sqlerrm
      where id = v_campaign.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  return jsonb_build_object('sent', v_sent, 'failed', v_failed);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Receipt reconciliation — collect Expo tickets for dispatched pushes and
--    null dead tokens on DeviceNotRegistered. Runs via cron (every 10 min);
--    each pass processes at most 100 outstanding receipts.
--    Uses net._http_collect_response directly (public wrapper is broken).
-- -----------------------------------------------------------------------------
create or replace function public.reconcile_notification_receipts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_receipt record;
  v_content text;
  v_status_code int;
  v_content_type text;
  v_payload jsonb;
  v_ticket jsonb;
  v_receipt_status text;
  v_processed int := 0;
begin
  if to_regprocedure('net._http_collect_response(bigint,boolean)') is null then
    return jsonb_build_object('skipped', 'pg_net_unavailable');
  end if;

  for v_receipt in
    select id, user_id, net_request_id
    from public.notification_delivery_receipts
    where net_request_id is not null
      and receipt_status is null
      and send_status = 'sent'
    order by created_at
    limit 100
  loop
    begin
      select content, status_code, content_type
      into v_content, v_status_code, v_content_type
      from net._http_collect_response(v_receipt.net_request_id, false);

      v_payload := nullif(v_content, '')::jsonb;
      v_ticket := v_payload->'data'->0;
      v_receipt_status := coalesce(v_ticket->>'status', 'unknown');

      update public.notification_delivery_receipts
      set receipt_status = v_receipt_status,
          expo_ticket_id = v_ticket->>'id',
          expo_response = v_payload,
          updated_at = now()
      where id = v_receipt.id;

      if v_receipt_status = 'error'
         and coalesce(v_ticket->'details'->>'error', '') = 'DeviceNotRegistered' then
        update public.user_profiles
        set expo_push_token = null
        where user_id = v_receipt.user_id
          and expo_push_token is not null;
      end if;

      v_processed := v_processed + 1;
    exception when others then
      -- Response not ready yet or malformed: leave for the next pass, but
      -- record repeated transport failures so they don't loop forever.
      if v_status_code is not null and (v_status_code < 200 or v_status_code >= 300) then
        update public.notification_delivery_receipts
        set receipt_status = 'transport_error',
            expo_response = jsonb_build_object('status_code', v_status_code, 'content', left(coalesce(v_content, ''), 2000)),
            updated_at = now()
        where id = v_receipt.id;
        v_processed := v_processed + 1;
      end if;
    end;
  end loop;

  return jsonb_build_object('processed', v_processed);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Analytics — real aggregate counts over the full tables (not the 75-row
--    page the admin UI fetches). time_filter is a day window as text
--    ('7', '30', '90'); null/''/'all' means all time.
-- -----------------------------------------------------------------------------
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
      'broadcasts', (select count(*) from public.notifications where is_broadcast = true and (v_window is null or created_at >= v_window))
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

-- -----------------------------------------------------------------------------
-- 7. RLS + grants lockdown (matches the live
--    lock_down_epic27_notification_function_grants fix).
-- -----------------------------------------------------------------------------
alter table public.notification_templates enable row level security;
alter table public.notification_automation_rules enable row level security;
alter table public.notification_campaigns enable row level security;
alter table public.notification_delivery_receipts enable row level security;
-- No client policies on purpose: all access is through service-role admin
-- route handlers (app/api/notifications/*), gated by requireAdminApiUser.

revoke all on table public.notification_templates from public, anon, authenticated;
revoke all on table public.notification_automation_rules from public, anon, authenticated;
revoke all on table public.notification_campaigns from public, anon, authenticated;
revoke all on table public.notification_delivery_receipts from public, anon, authenticated;
grant all on table public.notification_templates to service_role;
grant all on table public.notification_automation_rules to service_role;
grant all on table public.notification_campaigns to service_role;
grant all on table public.notification_delivery_receipts to service_role;

-- RPC execute grants: action/write = service_role only; read/preview =
-- authenticated + service_role.
revoke execute on function public.dispatch_notification(uuid, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.send_notification_campaign(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.send_due_notification_campaigns() from public, anon, authenticated;
revoke execute on function public.reconcile_notification_receipts() from public, anon, authenticated;
grant execute on function public.dispatch_notification(uuid, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.send_notification_campaign(uuid, uuid) to service_role;
grant execute on function public.send_due_notification_campaigns() to service_role;
grant execute on function public.reconcile_notification_receipts() to service_role;

revoke execute on function public.resolve_notification_segment(jsonb) from public, anon;
revoke execute on function public.get_notification_segment_count(jsonb) from public, anon;
revoke execute on function public.get_notification_analytics(text) from public, anon;
grant execute on function public.resolve_notification_segment(jsonb) to authenticated, service_role;
grant execute on function public.get_notification_segment_count(jsonb) to authenticated, service_role;
grant execute on function public.get_notification_analytics(text) to authenticated, service_role;

-- Cron wiring is idempotent only when pg_cron exists; skip silently otherwise
-- (live project schedules both jobs through the Supabase dashboard).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'epic27-send-due-campaigns',
      '*/5 * * * *',
      $$select public.send_due_notification_campaigns()$$
    );
    perform cron.schedule(
      'epic27-reconcile-receipts',
      '*/10 * * * *',
      $$select public.reconcile_notification_receipts()$$
    );
  end if;
exception when duplicate_object then
  null; -- already scheduled
end;
$$;
