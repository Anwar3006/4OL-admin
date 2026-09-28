-- =============================================================================
-- ROLLBACK for 20260926100000_af01_dependents_family_circle.sql
-- =============================================================================
-- Reverses AF-01 Phase 1+2. Order matters: drop functions first (they depend on
-- the tables/enums), then triggers, then tables, then the added column, then
-- enums last. All statements are IF EXISTS so the rollback is re-runnable.
--
-- DESTRUCTIVE: drops dependents / dependent_share_scopes / guardian_read_audit /
-- family_dependent_overrides and any rows in them, and removes
-- medication_reminders.managed_by (caregiver attribution is lost). Dry-run in a
-- rolled-back transaction on prod before applying (repo convention).
-- =============================================================================

-- 1. Functions
DROP FUNCTION IF EXISTS public.get_family_kpi_stats();
DROP FUNCTION IF EXISTS public.admin_set_family_override(uuid, integer, text);
DROP FUNCTION IF EXISTS public.admin_list_family_links(integer);
DROP FUNCTION IF EXISTS public.get_due_medication_reminders_fanout(timestamptz);
DROP FUNCTION IF EXISTS public.get_dependent_adherence_summary(uuid, integer);
DROP FUNCTION IF EXISTS public.get_guardian_read_audit(uuid);
DROP FUNCTION IF EXISTS public.get_my_guardian_links();
DROP FUNCTION IF EXISTS public.get_my_dependents();
DROP FUNCTION IF EXISTS public.set_dependent_status(uuid, public.dependent_status);
DROP FUNCTION IF EXISTS public.set_dependent_scope(uuid, public.dependent_share_scope, boolean);
DROP FUNCTION IF EXISTS public.claim_dependent_profile(text);
DROP FUNCTION IF EXISTS public.add_dependent(text, public.dependent_relationship, date, text, text);
DROP FUNCTION IF EXISTS public.get_my_entitlement_for(uuid);
DROP FUNCTION IF EXISTS public.family_dependent_limit(uuid);
DROP FUNCTION IF EXISTS public.dependents_touch_updated_at();

-- 2. Triggers
DROP TRIGGER IF EXISTS trg_dependents_touch ON public.dependents;

-- 3. Column added to an existing table
DROP INDEX IF EXISTS idx_medication_reminders_managed_by;
ALTER TABLE public.medication_reminders DROP COLUMN IF EXISTS managed_by;

-- 4. Tables (children before parents not required — ON DELETE CASCADE — but
--    drop in reverse-dependency order for clarity)
DROP TABLE IF EXISTS public.family_dependent_overrides;
DROP TABLE IF EXISTS public.guardian_read_audit;
DROP TABLE IF EXISTS public.dependent_share_scopes;
DROP TABLE IF EXISTS public.dependents;

-- 5. Enums last
DROP TYPE IF EXISTS public.dependent_share_scope;
DROP TYPE IF EXISTS public.dependent_status;
DROP TYPE IF EXISTS public.dependent_relationship;
