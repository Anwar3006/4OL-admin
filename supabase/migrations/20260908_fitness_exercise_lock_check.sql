-- ============================================================
-- fitness_exercises_read_gated (20260908_fitness_exercises_tier_rls.sql)
-- makes a locked exercise return NO ROW at all to a free user, which is
-- correct for the browse/plan-content paths but indistinguishable from
-- "this exercise doesn't exist" on a direct deep link (workout-detail.tsx),
-- where the app wants to show "Unlock PRO" rather than a generic not-found.
--
-- This SECURITY DEFINER function answers ONLY "does this id exist and is it
-- tier='pro'?" -- no exercise content (description, video, etc.) is
-- returned, so it can't be used to read locked content through the back
-- door; it only tells the client which empty-state copy to show.
-- ============================================================

create or replace function public.fn_fitness_exercise_is_locked(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select tier = 'pro'
       from public.fitness_exercises
      where id = p_exercise_id
        and is_active = true
        and status = 'published'),
    false
  );
$$;

revoke all on function public.fn_fitness_exercise_is_locked(uuid) from public;
grant execute on function public.fn_fitness_exercise_is_locked(uuid) to authenticated;
