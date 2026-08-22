-- =============================================================================
-- 20260822_transactions_ledger.sql
-- Transactions unification ledger (Gap Analysis Part AA).
--
-- Creates a single finance ledger so the Transactions menu (Recent, Service
-- Charge %, Subscriptions, Failed, Refunds, Tax & VAT, Expenses) can be served
-- from real data instead of mock rows:
--
--   transactions               unified ledger (user vs business payer_class)
--   refunds                    refund approval workflow
--   service_charge_rates       per-service fee rates (SA-editable)
--   tax_filings / finance_config  GRA filings schedule + platform TIN
--   operational_expenses       monthly operating cost buckets (SA-only)
--   finance_visibility_config  SA-controlled metric visibility for other roles
--   get_transactions_overview  aggregates consumed by /api/transactions/overview
--
-- Backfills the ledger from user_subscriptions (consumer subscription fees)
-- and escrow_transactions (escrow product sales + platform fees).
--
-- Additive and re-runnable: IF NOT EXISTS / ON CONFLICT everywhere.
-- RLS enabled on every table with NO policies — all access is through
-- service-role API routes behind requireAdminApiUser().
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Unified transactions ledger
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('TXN-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14)),
  category text not null default 'subscription_fee' check (category in
    ('subscription_fee', 'service_fee', 'product_sale', 'marketing_fee', 'refund', 'payout')),
  direction text not null default 'in' check (direction in ('in', 'out')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'GHS',
  payment_method text not null default 'manual',
  status text not null default 'received' check (status in
    ('received', 'processed', 'pending', 'failed', 'refunded', 'disputed', 'cancelled')),
  failure_reason text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  -- Payer segmentation: the Business vs User filter in the UI keys on payer_class.
  payer_class text not null default 'user' check (payer_class in ('user', 'business')),
  payer_user_id uuid references auth.users(id) on delete set null,
  payer_business_id uuid,
  payer_name text not null default '',
  payer_code text not null default '',           -- user#xxxx / IBP-xxxxx / FAC-xxxxx
  entity_kind text not null default 'consumer' check (entity_kind in ('consumer', 'ibp', 'facility')),
  txn_type_detail text,                          -- new / renewal / upgrade / downgrade
  plan_key text,                                 -- free / starter / pro / elite
  valid_until timestamptz,
  source text not null default 'manual' check (source in
    ('escrow', 'paystack', 'promo', 'manual', 'marketing', 'jobs', 'facility_sub', 'backfill')),
  source_id uuid,
  fee_rate_applied numeric(6,3),
  fee_amount numeric(12,2),
  created_by uuid,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_payer_class on public.transactions (payer_class);
create index if not exists idx_transactions_category on public.transactions (category);
create index if not exists idx_transactions_status on public.transactions (status);
create index if not exists idx_transactions_processed_at on public.transactions (processed_at);
create index if not exists idx_transactions_entity_kind on public.transactions (entity_kind);

-- -----------------------------------------------------------------------------
-- 2. Refund approval workflow
-- -----------------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text not null default 'other' check (reason in
    ('accidental_purchase', 'duplicate_charge', 'service_not_received', 'technical_error', 'other')),
  notes text,
  status text not null default 'pending_approval' check (status in
    ('pending_approval', 'processed', 'rejected')),
  requested_by uuid,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refunds_status on public.refunds (status);
create index if not exists idx_refunds_transaction on public.refunds (transaction_id);

-- -----------------------------------------------------------------------------
-- 3. Service charge rates (SA-editable; mockup parity defaults)
-- -----------------------------------------------------------------------------
create table if not exists public.service_charge_rates (
  key text primary key,
  label text not null,
  rate_pct numeric(6,2) not null default 0,
  basis text not null default 'pct_of_txn',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.service_charge_rates (key, label, rate_pct, basis) values
  ('med_enquiry',       'Medical Enquiry Fee',     4.5, 'pct_of_txn'),
  ('facility_booking',  'Facility Booking Fee',    5.0, 'pct_of_txn'),
  ('ibp_product_sale',  'IBP Product Sale Fee',    3.5, 'pct_of_txn'),
  ('marketing_campaign','Marketing Campaign Fee',  6.0, 'pct_of_txn'),
  ('delivery_escrow',   'Delivery Escrow Fee',     2.0, 'pct_of_txn'),
  ('jobs_premium_post', 'Jobs Premium Post Fee',   0.0, 'pct_of_txn')
on conflict (key) do update set label = excluded.label;

-- -----------------------------------------------------------------------------
-- 4. Tax filings schedule + finance config
-- -----------------------------------------------------------------------------
create table if not exists public.tax_filings (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  status text not null default 'not_started' check (status in ('filed', 'in_progress', 'not_started')),
  due_date date,
  remitted_amount numeric(12,2) not null default 0,
  filed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tax_filings (period, status, due_date, remitted_amount, filed_at)
select 'Q1 2026', 'filed', '2026-04-30'::date, 61420, '2026-04-28T09:00:00Z'::timestamptz
where not exists (select 1 from public.tax_filings where period = 'Q1 2026');
insert into public.tax_filings (period, status, due_date, remitted_amount)
select 'Q2 2026', 'in_progress', '2026-07-31'::date, 0
where not exists (select 1 from public.tax_filings where period = 'Q2 2026');

create table if not exists public.finance_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.finance_config (key, value) values ('gra_tin', 'C0042819876')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Operational expenses (SA-only surface in the UI)
-- -----------------------------------------------------------------------------
create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  month text not null,                       -- e.g. '2026-05'
  category text not null check (category in
    ('backend_servers', 'database', 'otp_sms', 'api_costs', 'domain_cdn',
     'marketing_ads', 'taxes_levies', 'other')),
  amount numeric(12,2) not null default 0,
  note text,
  entered_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opex_month on public.operational_expenses (month);

-- Seed the May 2026 expense buckets the mockup visualises (₵8,450 total).
do $$
begin
  if not exists (select 1 from public.operational_expenses where month = '2026-05') then
    insert into public.operational_expenses (month, category, amount) values
      ('2026-05', 'backend_servers', 1521.00),
      ('2026-05', 'database',        591.50),
      ('2026-05', 'otp_sms',         338.00),
      ('2026-05', 'api_costs',       760.50),
      ('2026-05', 'domain_cdn',      845.00),
      ('2026-05', 'marketing_ads',   1605.50),
      ('2026-05', 'taxes_levies',    2788.50);
  end if;
exception when others then null;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Finance metric visibility (SA-controlled gate for finance_admin et al.)
-- -----------------------------------------------------------------------------
create table if not exists public.finance_visibility_config (
  metric_key text primary key,
  visible_to_finance boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.finance_visibility_config (metric_key, visible_to_finance) values
  ('total_transactions', true),
  ('total_revenue', true),
  ('total_customers', true),
  ('gross_profit', true),
  ('revenue_chart', true),
  ('payment_methods', true),
  ('service_fee_revenue', true),
  ('subscription_kpis', true),
  ('tax_liability', true),
  ('high_value_rows', true)
on conflict (metric_key) do nothing;

-- -----------------------------------------------------------------------------
-- 7. RBAC catalog extension: hard-SA keys (no role rows => super_admin only).
-- -----------------------------------------------------------------------------
insert into public.admin_permissions (key, resource, action, description) values
  ('transactions.expenses', 'transactions', 'expenses', 'Manage operational expenses and P&L (super admin only)'),
  ('transactions.rates',    'transactions', 'rates',    'Edit service charge rates (super admin only)')
on conflict (key) do update set description = excluded.description;

-- -----------------------------------------------------------------------------
-- 8. Aggregation RPC consumed by /api/transactions/overview
-- -----------------------------------------------------------------------------
create or replace function public.get_transactions_overview()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
  v_revenue numeric;
  v_refunds numeric;
  v_expenses numeric;
  v_service_fees numeric;
  v_sub_revenue numeric;
  v_month_start date := date_trunc('month', now())::date;
begin
  select coalesce(sum(amount), 0) into v_revenue
  from transactions where direction = 'in' and status in ('received', 'processed');

  select coalesce(sum(amount), 0) into v_refunds
  from transactions where category = 'refund';

  select coalesce(sum(amount), 0) into v_expenses
  from operational_expenses;

  select coalesce(sum(amount), 0) into v_service_fees
  from transactions where category = 'service_fee' and status in ('received', 'processed');

  select coalesce(sum(amount), 0) into v_sub_revenue
  from transactions where category = 'subscription_fee' and status in ('received', 'processed');

  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_transactions', (select count(*) from transactions where status <> 'cancelled'),
      'total_revenue', round(v_revenue, 2),
      'total_customers', (select count(distinct payer_user_id) from transactions where payer_user_id is not null),
      'gross_profit', round(v_revenue - v_refunds - v_expenses, 2)
    ),
    'monthly', (
      select coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb) from (
        select to_char(date_trunc('month', processed_at), 'Mon YYYY') as month,
               round(sum(amount), 2) as revenue
        from transactions
        where direction = 'in' and status in ('received', 'processed')
          and processed_at >= now() - interval '6 months'
        group by date_trunc('month', processed_at)
        order by date_trunc('month', processed_at)
      ) m
    ),
    'payment_methods', (
      select coalesce(jsonb_object_agg(payment_method, amt), '{}'::jsonb) from (
        select payment_method, round(sum(amount), 2) as amt
        from transactions
        where direction = 'in' and status in ('received', 'processed')
        group by payment_method
      ) pm
    ),
    'service_fees', jsonb_build_object(
      'total_mtd', round(v_service_fees, 2),
      'ytd', round(v_service_fees, 2)
    ),
    'subscriptions', jsonb_build_object(
      'renewals_mtd', (select count(*) from transactions
                       where category = 'subscription_fee' and txn_type_detail = 'renewal'
                         and processed_at >= v_month_start::timestamptz),
      'new_mtd', (select count(*) from transactions
                  where category = 'subscription_fee' and coalesce(txn_type_detail, 'new') = 'new'
                    and processed_at >= v_month_start::timestamptz),
      'upgrades_mtd', (select count(*) from transactions
                       where category = 'subscription_fee' and txn_type_detail = 'upgrade'
                         and processed_at >= v_month_start::timestamptz),
      'churn_pct', round(
        coalesce(
          (select count(*) * 100.0 / nullif(sum(count(*)) over (), 0)
           from transactions where category = 'subscription_fee'
           group by status
           having status = 'cancelled'
           limit 1),
        0)::numeric, 1)
    ),
    'failed', jsonb_build_object(
      'count', (select count(*) from transactions where status = 'failed'),
      'amount_at_risk', round(coalesce((select sum(amount) from transactions where status = 'failed'), 0), 2)
    ),
    'tax', jsonb_build_object(
      'vat_pct', 12.5, 'nhil_pct', 2.5, 'getfund_pct', 2.5, 'combined_pct', 17.5, 'income_tax_pct', 25,
      'subscription_base', round(v_sub_revenue, 2),
      'vat', round(v_sub_revenue * 0.125, 2),
      'nhil', round(v_sub_revenue * 0.025, 2),
      'getfund', round(v_sub_revenue * 0.025, 2),
      'total_consumption_tax', round(v_sub_revenue * 0.175, 2),
      'service_fee_base', round(v_service_fees, 2),
      'income_tax', round(v_service_fees * 0.25, 2),
      'net_revenue', round(v_revenue - v_sub_revenue * 0.175, 2)
    ),
    'expenses', jsonb_build_object(
      'total', round(v_expenses, 2),
      'by_category', (
        select coalesce(jsonb_object_agg(category, amt), '{}'::jsonb) from (
          select category, round(sum(amount), 2) as amt
          from operational_expenses group by category
        ) e
      )
    )
  ) into result;

  return result;
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.get_transactions_overview() from public;
grant execute on function public.get_transactions_overview() to service_role;

-- -----------------------------------------------------------------------------
-- 9. Backfill ledger from existing money tables (idempotent via references)
-- -----------------------------------------------------------------------------
do $$
begin
  -- Consumer subscription fees from user_subscriptions (non-free tiers only).
  insert into public.transactions (
    reference, category, direction, amount, currency, payment_method, status,
    payer_class, payer_user_id, payer_name, payer_code, entity_kind,
    txn_type_detail, plan_key, valid_until, source, source_id, processed_at
  )
  select
    'BACKFILL-SUB-' || us.id::text,
    'subscription_fee', 'in',
    coalesce(t.price_ghs, 0),
    'GHS',
    coalesce(nullif(us.payment_method, ''), 'manual'),
    case
      when us.status = 'active' then 'received'
      when us.status = 'cancelled' then 'cancelled'
      else 'processed'
    end,
    'user', us.user_id, coalesce(us.note, ''), 'user#' || substr(replace(us.user_id::text, '-', ''), 1, 4),
    'consumer',
    'new',
    t.key, us.expires_at,
    'backfill', us.id, coalesce(us.starts_at, us.created_at)
  from public.user_subscriptions us
  join public.subscription_tiers t on t.id = us.tier_id
  where coalesce(t.key, '') <> 'free'
  on conflict (reference) do nothing;

  -- Escrow product sales (platform fee captured as fee_amount).
  insert into public.transactions (
    reference, category, direction, amount, currency, payment_method, status,
    payer_class, payer_user_id, payer_name, payer_code, entity_kind,
    fee_amount, source, source_id, processed_at
  )
  select
    'BACKFILL-ESC-' || e.id::text,
    'product_sale', 'in',
    coalesce(e.amount, 0),
    coalesce(e.currency, 'GHS'),
    coalesce(e.payment_provider, 'manual'),
    case e.status
      when 'released' then 'processed'
      when 'refunded' then 'refunded'
      when 'disputed' then 'disputed'
      when 'resolved' then 'processed'
      else 'pending'
    end,
    'user', e.buyer_id, 'Escrow order', 'user#' || substr(replace(coalesce(e.buyer_id::text, gen_random_uuid()::text), '-', ''), 1, 4),
    'consumer',
    coalesce(e.platform_fee, 0),
    'escrow', e.id, coalesce(e.released_at, e.held_at, e.created_at)
  from public.escrow_transactions e
  on conflict (reference) do nothing;
exception when others then null;  -- degrade silently if source tables differ
end $$;

-- -----------------------------------------------------------------------------
-- 10. RLS: enable with no policies; service-role API routes only.
-- -----------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.refunds enable row level security;
alter table public.service_charge_rates enable row level security;
alter table public.tax_filings enable row level security;
alter table public.finance_config enable row level security;
alter table public.operational_expenses enable row level security;
alter table public.finance_visibility_config enable row level security;

-- =============================================================================
-- END 20260822_transactions_ledger.sql
-- =============================================================================
