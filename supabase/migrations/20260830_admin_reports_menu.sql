-- ===========================================================================
-- 20260830_admin_reports_menu.sql
-- Reports menu: scheduled, AI-narrated platform reports for admins.
--
--   report_definitions     super-admin-managed schedules (cadence, sections,
--                          timezone, delivery hour, AI toggle)
--   report_recipients      which admin receives which report, via which
--                          channels, with optional per-recipient section
--                          redaction
--   report_runs            one immutable run per definition x window:
--                          deterministic metrics jsonb + AI narrative text.
--                          Idempotent per (definition, window).
--   report_delivery_logs   per-recipient/channel delivery audit
--   report_metrics_snapshots  window-level cache so long ranges never
--                          re-aggregate raw tables
--
-- Design rules enforced here:
--   * Numbers are deterministic (collectors); AI only writes the narrative.
--   * Runs hold aggregates only — no PII columns exist in this schema.
--   * Retention: dailies 90d, weeklies 365d, monthly+ effectively kept.
-- ===========================================================================

-- --------------------------------------------------------------- tables --

create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  cadence text not null check (cadence in ('daily','weekly','monthly','quarterly','yearly')),
  -- array of section keys: users, traction, admin_activity, security,
  -- finance, ai, marketing
  sections jsonb not null default '[]'::jsonb,
  timezone text not null default 'Africa/Accra',
  delivery_hour int not null default 7 check (delivery_hour between 0 and 23),
  ai_narrative boolean not null default true,
  enabled boolean not null default true,
  next_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_recipients (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.report_definitions(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  channels text[] not null default array['inbox'],
  -- sections hidden for this recipient even when the definition includes
  -- them (e.g. finance redacted for non-finance roles)
  redacted_sections jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (definition_id, admin_id)
);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.report_definitions(id) on delete cascade,
  cadence text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'queued'
    check (status in ('queued','collecting','narrating','delivered','delivered_metrics_only','failed')),
  metrics jsonb,
  anomalies jsonb not null default '[]'::jsonb,
  awaiting jsonb not null default '[]'::jsonb,
  narrative_md text,
  narrative_model text,
  error text,
  idempotency_key text not null,
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  check (period_end >= period_start)
);

create table if not exists public.report_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.report_runs(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete set null,
  channel text not null,
  status text not null check (status in ('sent','skipped','failed')),
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  created_at timestamptz not null default now(),
  unique (section, period_start, period_end)
);

create index if not exists idx_report_definitions_due
  on public.report_definitions (next_run_at) where enabled;
create index if not exists idx_report_runs_queue
  on public.report_runs (status) where status in ('queued','collecting','narrating');
create index if not exists idx_report_runs_definition
  on public.report_runs (definition_id, created_at desc);
create index if not exists idx_report_delivery_logs_run
  on public.report_delivery_logs (run_id);

-- ----------------------------------------------------------------- RLS ----
-- All access goes through the admin API with the service role; no direct
-- client policies are wanted here.

alter table public.report_definitions enable row level security;
alter table public.report_recipients enable row level security;
alter table public.report_runs enable row level security;
alter table public.report_delivery_logs enable row level security;
alter table public.report_metrics_snapshots enable row level security;

-- ----------------------------------------------------- permission seed ----

insert into public.admin_permissions (key, resource, action, description) values
  ('reports.view',   'reports', 'view',   'View platform reports delivered to me'),
  ('reports.manage', 'reports', 'manage', 'Manage report schedules, sections and recipients')
on conflict do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin',              'reports.view'),
  ('analyst',            'reports.view'),
  ('finance_admin',      'reports.view'),
  ('compliance_officer', 'reports.view')
on conflict do nothing;

-- ------------------------------------------------------- scheduling -------

-- Next delivery instant strictly after p_after_at for a definition's
-- cadence/timezone/hour.
create or replace function public.next_report_run_at(
  p_cadence text,
  p_timezone text,
  p_delivery_hour int,
  p_after_at timestamptz default now()
) returns timestamptz
language plpgsql stable
as $$
declare
  v_tz text := coalesce(nullif(p_timezone, ''), 'UTC');
  v_local_date date := (p_after_at at time zone v_tz)::date;
  v_candidate date;
  v_step interval;
  v_result timestamptz;
begin
  case p_cadence
    when 'daily' then
      v_candidate := v_local_date; v_step := interval '1 day';
    when 'weekly' then
      v_candidate := date_trunc('week', v_local_date)::date;
      if v_candidate < v_local_date then v_candidate := v_candidate + 7; end if;
      v_step := interval '7 days';
    when 'monthly' then
      v_candidate := date_trunc('month', v_local_date)::date;
      if v_candidate < v_local_date then v_candidate := (v_candidate + interval '1 month')::date; end if;
      v_step := interval '1 month';
    when 'quarterly' then
      v_candidate := date_trunc('quarter', v_local_date)::date;
      if v_candidate < v_local_date then v_candidate := (v_candidate + interval '3 months')::date; end if;
      v_step := interval '3 months';
    when 'yearly' then
      v_candidate := date_trunc('year', v_local_date)::date;
      if v_candidate < v_local_date then v_candidate := (v_candidate + interval '1 year')::date; end if;
      v_step := interval '1 year';
    else raise exception 'next_report_run_at: unknown cadence %', p_cadence;
  end case;

  v_result := timezone(v_tz, v_candidate::timestamp + make_interval(hours => p_delivery_hour));
  while v_result <= p_after_at loop
    v_candidate := (v_candidate::timestamp + v_step)::date;
    v_result := timezone(v_tz, v_candidate::timestamp + make_interval(hours => p_delivery_hour));
  end loop;
  return v_result;
end;
$$;

-- Idempotently enqueue one run per due definition for the last completed
-- window, then advance next_run_at. Safe to call frequently; the
-- idempotency key (definition:start:end) prevents duplicate runs.
create or replace function public.enqueue_due_report_runs(
  p_now timestamptz default now()
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_def record;
  v_local_date date;
  v_start date;
  v_end date;
  v_enqueued int := 0;
begin
  for v_def in
    select * from public.report_definitions
    where enabled and next_run_at is not null and next_run_at <= p_now
  loop
    v_local_date := (p_now at time zone coalesce(nullif(v_def.timezone, ''), 'UTC'))::date;
    case v_def.cadence
      when 'daily' then
        v_end := v_local_date - 1; v_start := v_end;
      when 'weekly' then
        v_end := date_trunc('week', v_local_date)::date - 1; v_start := v_end - 6;
      when 'monthly' then
        v_end := date_trunc('month', v_local_date)::date - 1;
        v_start := date_trunc('month', v_end)::date;
      when 'quarterly' then
        v_end := date_trunc('quarter', v_local_date)::date - 1;
        v_start := date_trunc('quarter', v_end)::date;
      when 'yearly' then
        v_end := date_trunc('year', v_local_date)::date - 1;
        v_start := date_trunc('year', v_end)::date;
      else continue;
    end case;

    insert into public.report_runs (definition_id, cadence, period_start, period_end, idempotency_key)
    values (v_def.id, v_def.cadence, v_start, v_end,
            v_def.id || ':' || v_start::text || ':' || v_end::text)
    on conflict (idempotency_key) do nothing;
    if found then v_enqueued := v_enqueued + 1; end if;

    update public.report_definitions
    set next_run_at = public.next_report_run_at(v_def.cadence, v_def.timezone, v_def.delivery_hour, p_now),
        updated_at = now()
    where id = v_def.id;
  end loop;
  return v_enqueued;
end;
$$;

-- Retention: dailies 90 days, weeklies 365 days; monthly and longer are
-- kept (they double as the historical archive). Delivery logs cascade.
create or replace function public.purge_expired_report_runs()
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  with deleted as (
    delete from public.report_runs r
    where r.status in ('delivered','delivered_metrics_only','failed')
      and r.created_at < now() - case r.cadence
        when 'daily' then interval '90 days'
        when 'weekly' then interval '365 days'
        else interval '20 years'
      end
    returning 1
  )
  select count(*) into v_deleted from deleted;
  return v_deleted;
end;
$$;

revoke execute on function public.next_report_run_at(text, text, int, timestamptz) from public, anon, authenticated;
revoke execute on function public.enqueue_due_report_runs(timestamptz) from public, anon, authenticated;
revoke execute on function public.purge_expired_report_runs() from public, anon, authenticated;
grant execute on function public.next_report_run_at(text, text, int, timestamptz) to service_role;
grant execute on function public.enqueue_due_report_runs(timestamptz) to service_role;
grant execute on function public.purge_expired_report_runs() to service_role;

-- ------------------------------------------------------------- pg_cron ----
-- Enqueue due runs hourly; retention sweep daily at 03:10 UTC. Guarded so
-- the migration applies on projects without pg_cron (call the functions
-- manually or rely on the /api/reports/cron worker instead).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'reports-enqueue-due',
      '5 * * * *',
      $cron$select public.enqueue_due_report_runs()$cron$
    );
    perform cron.schedule(
      'reports-retention-purge',
      '10 3 * * *',
      $cron$select public.purge_expired_report_runs()$cron$
    );
  else
    raise notice 'pg_cron not installed — report enqueue/purge functions created but not scheduled. The /api/reports/cron worker (vercel.json) drives processing either way.';
  end if;
exception when others then
  raise notice 'pg_cron wiring skipped: %', sqlerrm;
end;
$$;
