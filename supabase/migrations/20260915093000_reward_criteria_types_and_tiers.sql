-- Pregenerated criteria registry: the admin tier builder only ever offers a
-- dropdown over these rows, so an admin can never wire up a rule nobody
-- implemented. Each key is a real code path in close_period_trivia_event
-- (see 20260915113000_period_trivia_ranked_submissions_and_close.sql).
create table public.reward_criteria_types (
  key text primary key,
  label text not null,
  description text not null,
  params_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reward_criteria_types enable row level security;
revoke all on table public.reward_criteria_types from anon, authenticated;
grant select on table public.reward_criteria_types to authenticated;
grant all on table public.reward_criteria_types to service_role;

comment on table public.reward_criteria_types is
  'Pregenerated winner-criteria registry the admin tier builder chooses from — never free text.';

insert into public.reward_criteria_types (key, label, description, params_schema) values
  ('top_n_ranked', 'Top N ranked', 'The best N submissions by rank (score, then speed, then who entered first).', '{"n": "integer"}'::jsonb),
  ('rank_range', 'Rank range', 'Everyone whose rank falls within a band, e.g. 11th to 50th place.', '{"from": "integer", "to": "integer"}'::jsonb),
  ('perfect_score', 'Perfect score', 'Everyone who answered every question correctly.', '{}'::jsonb),
  ('min_score', 'Minimum score', 'Everyone scoring at or above a threshold.', '{"min": "integer"}'::jsonb),
  ('fastest_perfect_n', 'Fastest N perfect scores', 'The N fastest submissions among perfect scores.', '{"n": "integer"}'::jsonb),
  ('all_participants', 'All participants', 'Everyone who completed the event.', '{}'::jsonb),
  ('random_draw', 'Random draw', 'A seeded, reproducible random draw among qualifying entrants.', '{"n": "integer", "min_score": "integer", "seed": "string"}'::jsonb)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  params_schema = excluded.params_schema;

-- Generic criteria+tier join. Deliberately NOT trivia-prefixed and shaped
-- like reward_grants' source_domain/source_type/source_id so fitness
-- challenges (and future rewardable areas) can adopt it later without
-- rework — only trivia's close function reads it today.
create table public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  source_domain text not null check (
    source_domain in ('general', 'trivia', 'fitness', 'fitcoins', 'facility_scout')
  ),
  source_id uuid not null,
  reward_id uuid not null references public.reward_catalog(id) on delete restrict,
  tier_label text not null check (char_length(trim(tier_label)) between 2 and 120),
  tier_order int not null check (tier_order > 0),
  criteria_type text not null references public.reward_criteria_types(key),
  criteria_params jsonb not null default '{}'::jsonb,
  max_winners int check (max_winners is null or max_winners > 0),
  stackable boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_domain, source_id, tier_order)
);

create index reward_tiers_source_idx
  on public.reward_tiers (source_domain, source_id, tier_order);

alter table public.reward_tiers enable row level security;
revoke all on table public.reward_tiers from anon, authenticated;
grant all on table public.reward_tiers to service_role;

comment on table public.reward_tiers is
  'Winner-criteria tiers for a rewardable event/object (e.g. a trivia event). reward_catalog stays reusable; the criteria that decide who wins live here, keyed by source_domain+source_id.';
