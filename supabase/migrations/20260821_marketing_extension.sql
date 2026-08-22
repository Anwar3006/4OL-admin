-- =============================================================================
-- Marketing management extension (Gap Analysis Part M).
--
-- Closes M1: marketing had zero server API surface — all data access was
-- client-side Supabase, bypassing RBAC. This migration gives the new
-- /api/marketing/* routes (marketing.view/create/edit/delete) the schema
-- they need.
-- Decisions: M-D3 (business submissions live in marketing_profile with
-- campaign_type = 'business_submitted' + review fields), M-D5
-- (user_subscriptions now; billing history deferred until a transactions
-- source exists), M-D7 (startDate/endDate stay text — the mobile app writes
-- them; we ADD timestamptz twins starts_at/ends_at and backfill, which is
-- non-breaking instead of a destructive type conversion).
-- Additive and re-runnable.
-- =============================================================================

-- 1. Campaign lifecycle extension (M3/M4) ------------------------------------------
do $$
begin
  if exists (select 1 from pg_type where typname = 'marketing_status_enum') then
    -- Pending-review/rejected/scheduled lifecycle for business submissions.
    begin
      alter type public.marketing_status_enum add value if not exists 'pending_review';
    exception when duplicate_object then null;
    end;
    begin
      alter type public.marketing_status_enum add value if not exists 'rejected';
    exception when duplicate_object then null;
    end;
    begin
      alter type public.marketing_status_enum add value if not exists 'scheduled';
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

alter table public.marketing_profile
  add column if not exists campaign_type text
    check (campaign_type in
      ('app_promotion', 'feature_launch', 'seasonal', 'business_submitted', 'referral')),
  add column if not exists channels text[] not null default '{}',
  add column if not exists target_segment text,
  add column if not exists budget numeric,
  add column if not exists impressions integer not null default 0,
  add column if not exists clicks integer not null default 0,
  add column if not exists conversions integer not null default 0,
  add column if not exists submitted_by_business uuid
    references public.user_profiles (user_id),
  add column if not exists reviewed_by uuid
    references public.user_profiles (user_id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists approved_start_date timestamptz,
  add column if not exists approved_end_date timestamptz,
  -- M-D7: non-breaking timestamptz twins of the legacy text dates.
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

-- Exception-safe cast: WHERE/SET cast order is not guaranteed, so unparsable
-- legacy values must resolve to NULL instead of aborting the backfill.
create or replace function public.safe_to_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if p_value is null or trim(p_value) = '' then return null; end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

-- Backfill the twins where the legacy text parses cleanly; unparsable rows
-- keep NULL twins and the text columns remain authoritative for them.
-- marketing_profile uses quoted camelCase identifiers ("startDate"), so the
-- legacy columns must be referenced quoted or Postgres lowercases them.
update public.marketing_profile
set starts_at = public.safe_to_timestamptz("startDate")
where starts_at is null and "startDate" is not null;

update public.marketing_profile
set ends_at = public.safe_to_timestamptz("endDate")
where ends_at is null and "endDate" is not null;

create index if not exists idx_marketing_profile_status
  on public.marketing_profile (status);
create index if not exists idx_marketing_profile_campaign_type
  on public.marketing_profile (campaign_type);

-- 2. Discount segmentation + lifecycle (M10) ----------------------------------------
-- The mockup wants % Off / Fixed / Free Trial / Partner types; widen the
-- legacy CHECK (percentage/fixed/bogo) with a superset. Drop + re-add is
-- re-runnable and keeps existing rows valid.
alter table public.marketing_discounts
  drop constraint if exists marketing_discounts_discount_type_check;
alter table public.marketing_discounts
  add constraint marketing_discounts_discount_type_check
  check (discount_type in ('percentage', 'fixed', 'bogo', 'free_trial', 'partner'));

alter table public.marketing_discounts
  add column if not exists eligible_plans text[] not null default '{}',
  add column if not exists eligible_users text not null default 'all'
    check (eligible_users in ('all', 'new', 'nhis_linked', 'free_plan')),
  add column if not exists per_user_limit integer,
  add column if not exists campaign_id uuid references public.marketing_profile (id),
  add column if not exists status text not null default 'active'
    check (status in ('active', 'expired', 'scheduled', 'paused'));

-- Backfill status from the legacy is_active flag (re-runnable: only touches
-- rows still carrying the seeded default).
update public.marketing_discounts
set status = case
  when is_active = false then 'paused'
  when valid_from > now() then 'scheduled'
  when valid_until is not null and valid_until < now() then 'expired'
  else 'active'
end;

create index if not exists idx_marketing_discounts_status
  on public.marketing_discounts (status);

-- 3. User subscriptions --------------------------------------------------------------
-- MOVED: the subscriber table is created/reconciled by
-- 20260822_marketing_unification.sql, which upgrades whichever
-- user_subscriptions shape exists (business / fitness / fresh DB) into the
-- single unified consumer-subscriptions table (tier_id -> subscription_tiers).
-- This migration no longer defines its own competing shape — three
-- CREATE TABLE IF NOT EXISTS definitions of the same table silently
-- disabled each other depending on apply order.

-- 4. KPI/analytics RPC ----------------------------------------------------------------
create or replace function public.get_marketing_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'campaigns', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (select status::text as status, count(*) as cnt
            from public.marketing_profile group by 1) c
    ),
    'discounts', jsonb_build_object(
      'active', (select count(*) from public.marketing_discounts where status = 'active'),
      'total_uses_30d', (select coalesce(sum(current_uses), 0) from public.marketing_discounts)
    ),
    'subscribers', jsonb_build_object(
      'premium_users', (select count(*) from public.user_subscriptions where status = 'active'),
      'at_risk', (select count(*) from public.user_subscriptions where status = 'at_risk'),
      'mrr', (
        select coalesce(sum(ms.price), 0)
        from public.user_subscriptions us
        join public.marketing_subscriptions ms on ms.id = us.plan_id
        where us.status = 'active' and ms.billing_cycle = 'monthly'
      )
    )
  );
$$;

-- 5. RLS: service-role-only surfaces ----------------------------------------------------
alter table public.user_subscriptions enable row level security;
-- No policies: service-role server routes only (marketing.* keys).

revoke all on function public.get_marketing_overview() from public, anon, authenticated;
grant execute on function public.get_marketing_overview() to service_role;
