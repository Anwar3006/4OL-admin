-- =============================================================================
-- Challenge view tracking (G1 gap-closure)
--
-- Mobile (hooks/use-fitness-challenges.ts useTrackChallengeView) has called
-- increment_challenge_view_count since the fitness challenges feature
-- shipped, but the function and its backing table were never created —
-- neither repo's migrations define it, and it does not exist in the live
-- DB. Every call has been silently failing; challenge views are not
-- tracked. Mirrors the condition_views / increment_condition_view_count
-- pattern exactly (same dedupe-via-unique-constraint shape, same RLS,
-- same grants).
-- =============================================================================

alter table public.fitness_challenges
  add column if not exists view_count integer not null default 0;

create table if not exists public.challenge_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  challenge_id uuid not null references public.fitness_challenges(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()),
  unique (user_id, challenge_id)
);

alter table public.challenge_views enable row level security;

drop policy if exists "admin manage view logs" on public.challenge_views;
create policy "admin manage view logs"
  on public.challenge_views
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "log own views" on public.challenge_views;
create policy "log own views"
  on public.challenge_views
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own view logs" on public.challenge_views;
create policy "own view logs"
  on public.challenge_views
  for select
  to authenticated
  using (auth.uid() = user_id or is_admin());

create or replace function public.increment_challenge_view_count(
  challenge_id_param uuid,
  user_id_param uuid
)
returns void
language plpgsql
security definer
as $function$
BEGIN
  INSERT INTO public.challenge_views (user_id, challenge_id)
  VALUES (user_id_param, challenge_id_param)
  ON CONFLICT (user_id, challenge_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.fitness_challenges
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = challenge_id_param;
  END IF;
END;
$function$;

grant execute on function public.increment_challenge_view_count(uuid, uuid) to authenticated, service_role;
