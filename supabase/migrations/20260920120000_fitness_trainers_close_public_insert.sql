-- ============================================================================
-- P0-04 · Close public self-insert on fitness_trainers (PLAN.md P0-04)
-- ============================================================================
--
-- Before (prod, 20 Sept 2026):
--   INSERT "Anyone can insert fitness_trainers"  TO public  WITH CHECK (true)
--   + table grants INSERT to anon and authenticated
-- → anyone, even without logging in, could create a trainer profile (with
--   is_verified / status of their choosing) that the app would list.
--
-- After:
--   - Only "Admins can manage fitness_trainers" (admin, super_admin; ALL)
--     can insert. That's what the admin console's useCreateTrainer uses.
--   - anon loses INSERT/UPDATE/DELETE grants on the table entirely.
--   - Reads are unchanged ("Allow authenticated select for fitness_trainers").
--
-- Trainers onboard as providers later (PLAN.md P0-10/P0-12): the provider
-- flow creates the row server-side and links fitness_trainers.provider_id.
-- ============================================================================

drop policy if exists "Anyone can insert fitness_trainers" on public.fitness_trainers;

revoke insert, update, delete on public.fitness_trainers from anon;
