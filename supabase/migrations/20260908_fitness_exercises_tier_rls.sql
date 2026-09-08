-- ============================================================
-- fitness_exercises SELECT was fully open ("Allow authenticated select for
-- fitness_exercises", qual: true) -- the tier column existed but nothing
-- enforced it. Mirrors the fitness_plans_read_gated pattern from
-- 20260903_close_premium_bypass_gaps.sql.
--
-- The escape-hatch clause (exists a fitness_plan_exercises row on a plan
-- this user is assigned to) is not optional: every plan assigned before
-- this migration was built entirely from tier='pro' exercises (the
-- pre-bootstrap default), so without it every existing user's plan-detail
-- view would silently lose its exercises the moment this ships.
-- ============================================================

drop policy if exists "Allow authenticated select for fitness_exercises" on public.fitness_exercises;

create policy "fitness_exercises_read_gated" on public.fitness_exercises
  for select
  using (
    coalesce(tier, 'pro') <> 'pro'
    or is_admin()
    or coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    or exists (
      select 1 from public.fitness_plan_exercises fpe
      join public.fitness_user_assignments fua on fua.plan_id = fpe.plan_id
      where fpe.exercise_id = fitness_exercises.id
        and fua.user_id::text = (auth.jwt() ->> 'sub')
    )
  );
