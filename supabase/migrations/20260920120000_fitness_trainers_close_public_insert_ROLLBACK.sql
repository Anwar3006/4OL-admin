-- ROLLBACK for 20260920120000_fitness_trainers_close_public_insert
-- WARNING: re-opens anonymous trainer self-registration.
begin;
grant insert, update, delete on public.fitness_trainers to anon;
create policy "Anyone can insert fitness_trainers"
  on public.fitness_trainers for insert to public
  with check (true);
commit;
