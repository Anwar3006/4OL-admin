-- Central reward definitions reused by Trivia, Fitness, FitCoins and future
-- rewardable product areas. Domain tables keep only their award rules and
-- fulfillment state; the user-facing reward definition lives here.
create table public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  icon text not null default '🎁',
  image_url text,
  reward_type text not null default 'prize' check (
    reward_type in (
      'cash', 'points', 'badge', 'discount', 'prize', 'airtime',
      'data', 'fitcoins', 'subscription', 'physical', 'other'
    )
  ),
  value text,
  amount numeric(14,2) check (amount is null or amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  domains text[] not null default array['general']::text[] check (
    cardinality(domains) > 0
    and domains <@ array['general', 'trivia', 'fitness', 'fitcoins', 'facility_scout']::text[]
  ),
  fulfillment_method text not null default 'manual' check (
    fulfillment_method in ('automatic', 'manual', 'code', 'digital', 'physical')
  ),
  inventory_count integer check (inventory_count is null or inventory_count >= 0),
  is_active boolean not null default true,
  source_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_catalog_active_domains_idx
  on public.reward_catalog using gin (domains)
  where is_active;
create index reward_catalog_created_at_idx
  on public.reward_catalog (created_at desc);
create index reward_catalog_created_by_idx
  on public.reward_catalog (created_by)
  where created_by is not null;

-- Preserve the current Trivia IDs so event and fulfillment references remain
-- stable while their foreign keys move to the shared catalogue.
insert into public.reward_catalog (
  id, name, description, icon, reward_type, value, amount, currency,
  domains, fulfillment_method, is_active, source_key, created_by,
  created_at, updated_at
)
select
  id,
  name,
  description,
  icon,
  reward_type,
  value,
  case when reward_type = 'cash' and value ~ '^\s*[0-9]+([.][0-9]+)?\s*$'
    then trim(value)::numeric else null end,
  case when reward_type = 'cash' then 'GHS' else null end,
  array['trivia']::text[],
  'manual',
  is_active,
  'period_trivia:' || id::text,
  created_by,
  created_at,
  updated_at
from public.period_trivia_rewards
on conflict (id) do nothing;

alter table public.period_trivia_events
  add constraint period_trivia_events_catalog_reward_id_fkey
  foreign key (reward_id) references public.reward_catalog(id) on delete set null;

alter table public.period_trivia_fulfillment
  add constraint period_trivia_fulfillment_catalog_reward_id_fkey
  foreign key (reward_id) references public.reward_catalog(id) on delete set null;

create index if not exists period_trivia_events_reward_id_idx
  on public.period_trivia_events (reward_id)
  where reward_id is not null;
create index if not exists period_trivia_fulfillment_reward_id_idx
  on public.period_trivia_fulfillment (reward_id)
  where reward_id is not null;

-- Challenges retain the description/image snapshots for already-released
-- mobile clients, while reward_id becomes the reusable canonical link.
alter table public.fitness_challenges
  add column reward_id uuid references public.reward_catalog(id) on delete set null;

insert into public.reward_catalog (
  name, description, image_url, reward_type, domains, fulfillment_method,
  source_key, created_by, created_at, updated_at
)
select
  left(coalesce(nullif(trim(reward_description), ''), title || ' reward'), 120),
  nullif(trim(reward_description), ''),
  nullif(trim(reward_image_url), ''),
  'prize',
  array['fitness']::text[],
  'manual',
  'fitness_challenge:' || id::text,
  created_by,
  created_at,
  updated_at
from public.fitness_challenges
where nullif(trim(reward_description), '') is not null
   or nullif(trim(reward_image_url), '') is not null
on conflict (source_key) do nothing;

update public.fitness_challenges challenge
set reward_id = reward.id
from public.reward_catalog reward
where reward.source_key = 'fitness_challenge:' || challenge.id::text
  and challenge.reward_id is null;

create index fitness_challenges_reward_id_idx
  on public.fitness_challenges (reward_id)
  where reward_id is not null;

-- FitCoins keeps its redemption-specific cost/tier fields and points to the
-- same catalogue for the reusable reward definition.
alter table public.fitcoin_rewards
  add column catalog_reward_id uuid unique
  references public.reward_catalog(id) on delete set null;

insert into public.reward_catalog (
  name, description, reward_type, value, domains, fulfillment_method,
  is_active, source_key, created_at, updated_at
)
select
  name,
  description,
  'fitcoins',
  cost::text || ' FitCoins',
  array['fitcoins']::text[],
  'manual',
  coalesce(is_active, true),
  'fitcoin_reward:' || id::text,
  created_at,
  created_at
from public.fitcoin_rewards
on conflict (source_key) do nothing;

update public.fitcoin_rewards item
set catalog_reward_id = reward.id
from public.reward_catalog reward
where reward.source_key = 'fitcoin_reward:' || item.id::text
  and item.catalog_reward_id is null;

-- Temporary bidirectional compatibility keeps already-deployed admin/API
-- versions working during rollout. New code treats reward_catalog as the
-- canonical table; the legacy Trivia catalogue mirrors its shared fields.
create or replace function public.sync_reward_catalog_to_legacy_trivia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.period_trivia_rewards (
    id, name, description, icon, reward_type, value, is_active,
    created_by, created_at, updated_at
  ) values (
    new.id,
    new.name,
    coalesce(new.description, ''),
    new.icon,
    case
      when new.reward_type in ('points', 'badge', 'discount', 'prize', 'cash', 'airtime')
        then new.reward_type
      when new.reward_type = 'data' then 'airtime'
      else 'prize'
    end,
    coalesce(new.value, case when new.amount is not null then new.amount::text else null end),
    new.is_active,
    new.created_by,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    reward_type = excluded.reward_type,
    value = excluded.value,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

create or replace function public.sync_legacy_trivia_to_reward_catalog()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.reward_catalog (
    id, name, description, icon, reward_type, value, amount, currency,
    domains, fulfillment_method, is_active, source_key, created_by,
    created_at, updated_at
  ) values (
    new.id,
    new.name,
    new.description,
    new.icon,
    new.reward_type,
    new.value,
    case when new.reward_type = 'cash' and new.value ~ '^\s*[0-9]+([.][0-9]+)?\s*$'
      then trim(new.value)::numeric else null end,
    case when new.reward_type = 'cash' then 'GHS' else null end,
    array['trivia']::text[],
    'manual',
    new.is_active,
    'period_trivia:' || new.id::text,
    new.created_by,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    reward_type = excluded.reward_type,
    value = excluded.value,
    amount = excluded.amount,
    currency = excluded.currency,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

create trigger sync_reward_catalog_to_legacy_trivia_trigger
after insert or update of name, description, icon, reward_type, value, amount,
  currency, is_active on public.reward_catalog
for each row execute function public.sync_reward_catalog_to_legacy_trivia();

create trigger sync_legacy_trivia_to_reward_catalog_trigger
after insert or update of name, description, icon, reward_type, value,
  is_active on public.period_trivia_rewards
for each row execute function public.sync_legacy_trivia_to_reward_catalog();

-- Mirror Fitness/FitCoins-originated rows too so the old Trivia foreign key
-- remains valid while older deployments coexist with the shared catalogue.
insert into public.period_trivia_rewards (
  id, name, description, icon, reward_type, value, is_active,
  created_by, created_at, updated_at
)
select
  id,
  name,
  coalesce(description, ''),
  icon,
  case
    when reward_type in ('points', 'badge', 'discount', 'prize', 'cash', 'airtime') then reward_type
    when reward_type = 'data' then 'airtime'
    else 'prize'
  end,
  coalesce(value, case when amount is not null then amount::text else null end),
  is_active,
  created_by,
  created_at,
  updated_at
from public.reward_catalog
on conflict (id) do nothing;

-- Cross-domain account-level award and fulfillment ledger. Existing Trivia
-- fulfillment remains in place and can be folded into this ledger later.
create table public.reward_grants (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.reward_catalog(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_domain text not null check (
    source_domain in ('general', 'trivia', 'fitness', 'fitcoins', 'facility_scout')
  ),
  source_type text not null,
  source_id uuid,
  status text not null default 'awarded' check (
    status in ('awarded', 'pending', 'claimed', 'fulfilled', 'cancelled', 'expired')
  ),
  quantity integer not null default 1 check (quantity > 0),
  reward_snapshot jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  claimed_at timestamptz,
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_grants_user_created_idx
  on public.reward_grants (user_id, created_at desc);
create index reward_grants_reward_status_idx
  on public.reward_grants (reward_id, status);
create index reward_grants_fulfilled_by_idx
  on public.reward_grants (fulfilled_by)
  where fulfilled_by is not null;
create unique index reward_grants_source_user_unique
  on public.reward_grants (source_domain, source_type, source_id, user_id, reward_id)
  where source_id is not null and status <> 'cancelled';

alter table public.reward_catalog enable row level security;
alter table public.reward_grants enable row level security;

revoke all on table public.reward_catalog from anon, authenticated;
revoke all on table public.reward_grants from anon, authenticated;
grant all on table public.reward_catalog to service_role;
grant all on table public.reward_grants to service_role;

comment on table public.reward_catalog is
  'Canonical reusable reward definitions. Domain tables reference these rows and retain only award-specific rules.';
comment on table public.reward_grants is
  'Account-level reward award, claim and fulfillment ledger across product domains.';

insert into public.admin_permissions (key, resource, action, description) values
  ('rewards.view', 'rewards', 'view', 'View the cross-domain rewards catalogue and usage'),
  ('rewards.manage', 'rewards', 'manage', 'Create, edit and assign reusable rewards')
on conflict (key) do update set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'rewards.view'),
  ('admin', 'rewards.manage'),
  ('content_manager', 'rewards.view'),
  ('content_manager', 'rewards.manage')
on conflict do nothing;
