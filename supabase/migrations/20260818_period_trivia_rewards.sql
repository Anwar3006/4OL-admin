-- Reusable reward catalog for Friday Trivia. An event's reward is picked by
-- an admin from this catalog (not free text) so payouts stay consistent and
-- auditable across events, and so both the manual question form and the AI
-- Hub generation form can attach a reward without re-typing it.
create table if not exists public.period_trivia_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text not null default '🏆',
  reward_type text not null default 'points' check (reward_type in ('points', 'badge', 'discount', 'prize')),
  value text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.period_trivia_events
  add column if not exists reward_id uuid references public.period_trivia_rewards(id) on delete set null;

alter table public.period_trivia_rewards enable row level security;

create policy admin_access on public.period_trivia_rewards
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- The mobile Trivia screen reads the attached reward through the same
-- anonymous-device flow used for the rest of /api/period/trivia, so active
-- rewards need to be publicly readable (name/description/icon only -- no
-- sensitive data on this table).
create policy public_read_active on public.period_trivia_rewards
  for select to anon, authenticated
  using (is_active);
