-- ============================================================================
-- ROLLBACK for migration 20260912213300_rls_initplan_optimisation
-- ============================================================================
--
-- That migration did two things:
--   1. ALTER FUNCTION public.get_user_app_role() STABLE
--      (it was VOLATILE, which forced per-row execution inside RLS policies)
--   2. Rewrote 388 policies across 174 tables, wrapping bare calls to
--      auth.uid() / auth.jwt() / auth.role() / get_user_app_role() /
--      is_app_admin() / is_admin() / get_my_entitlement() / request_user_id()
--      in (select ...) so the planner hoists them into a one-shot InitPlan.
--
-- The rewrite is semantics-preserving. It was verified by counting visible rows
-- on all 53 non-empty policied tables, as both `authenticated` (using a real
-- user_profiles id) and `anon`, before and after: 106 checks, 0 mismatches.
-- Policy count, cmd and roles were unchanged on all 479 policies.
--
-- Measured effect on activity_logs (12,282 rows, 3 affected policies):
--   before 555.7 ms  ->  after 4.8 ms   (116x)
-- Supabase performance advisor: auth_rls_initplan 146 -> 0.
--
-- ── HOW TO ROLL BACK ────────────────────────────────────────────────────────
-- Every original policy expression is stored verbatim in
-- migration_backup.policy_migration_20260912.rollback_sql. Run this file.
--
-- If that table has been dropped, the full pre-migration policy snapshot is
-- also in migration_backup.rls_policies_20260912.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  r        record;
  reverted int := 0;
  failed   int := 0;
BEGIN
  IF to_regclass('migration_backup.policy_migration_20260912') IS NULL THEN
    RAISE EXCEPTION 'Backup table migration_backup.policy_migration_20260912 is gone — '
                    'fall back to migration_backup.rls_policies_20260912.';
  END IF;

  FOR r IN
    SELECT rollback_sql, tablename, policyname
    FROM migration_backup.policy_migration_20260912
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      EXECUTE r.rollback_sql;
      reverted := reverted + 1;
    EXCEPTION WHEN others THEN
      failed := failed + 1;
      RAISE WARNING 'FAILED %.% : %', r.tablename, r.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'reverted=% failed=%', reverted, failed;

  IF failed > 0 THEN
    RAISE EXCEPTION 'Aborting: % policies failed to revert', failed;
  END IF;
END $$;

-- Restore the original (incorrect, but original) volatility label.
ALTER FUNCTION public.get_user_app_role() VOLATILE;

COMMIT;

-- ── Verify the rollback landed ──────────────────────────────────────────────
-- Expect: 388 unwrapped calls back, and VOLATILE.
--
-- SELECT count(*) FILTER (
--          WHERE (coalesce(qual,'')||' '||coalesce(with_check,''))
--                ~ '(?<![Ss][Ee][Ll][Ee][Cc][Tt] )(auth\.uid|auth\.jwt|get_user_app_role|is_app_admin|is_admin|get_my_entitlement|request_user_id)\(\)'
--        ) AS unwrapped
-- FROM pg_policies WHERE schemaname = 'public';


-- ============================================================================
-- CLEANUP (only once you are confident you will not roll back)
-- ============================================================================
-- The backup schema holds ~520 kB and is not exposed through PostgREST.
-- Keeping it is cheap; dropping it removes your rollback path.
--
--   DROP SCHEMA migration_backup CASCADE;


-- ============================================================================
-- RE-RUNNING THE FORWARD MIGRATION
-- ============================================================================
-- migration_backup.wrap_initplan(text) is idempotent, so this is safe to run
-- again after adding new policies. Regenerate and apply:
--
--   UPDATE migration_backup.policy_migration_20260912 m
--   SET forward_sql = format('ALTER POLICY %I ON public.%I%s%s;',
--         p.policyname, p.tablename,
--         CASE WHEN migration_backup.wrap_initplan(p.qual) IS NOT NULL
--              THEN ' USING ('||migration_backup.wrap_initplan(p.qual)||')' ELSE '' END,
--         CASE WHEN migration_backup.wrap_initplan(p.with_check) IS NOT NULL
--              THEN ' WITH CHECK ('||migration_backup.wrap_initplan(p.with_check)||')' ELSE '' END)
--   FROM pg_policies p
--   WHERE p.schemaname='public' AND p.tablename=m.tablename AND p.policyname=m.policyname;
--
-- Then loop over forward_sql exactly as the migration did.
--
-- NOTE: any NEW policy you write from here on should use the wrapped form
-- directly — (select auth.uid()), not auth.uid() — or it reintroduces the
-- per-row cost on that table. Worth a lint rule in CI.
