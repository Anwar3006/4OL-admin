-- Epic 21: formalize delete_account_requests' status vocabulary.
--
-- The column had no CHECK constraint at all — DeleteRequestStats.tsx's
-- hardcoded mockup already implied a 5-state lifecycle (Pending Review /
-- In Verification / In Grace Period / Completed / Cancelled) that nothing
-- in the schema or code actually enforced. The only code that wrote
-- statuses used a different, simpler 3-value vocabulary (pending/approved/
-- rejected — app/api/user/delete-account-request/route.js,
-- hooks/supabase-calls/useDeleteAccountRequests.ts). This migration adopts
-- the 5-value vocabulary the UI already assumes.
--
-- Lifecycle:
--   pending_review  -> user submitted a request, awaiting first admin look
--   in_verification -> admin/system verifying identity (e.g. OTP)
--   grace_period    -> approved; login access revoked immediately (matches
--                      the mobile app's own copy); reversible window
--   completed       -> grace period elapsed, data anonymized (see
--                      expire_delete_account_grace_periods() below) —
--                      terminal, not reversible
--   cancelled        -> withdrawn or rejected at any point before completed
--                      — terminal

-- 1. Track when the grace period actually started, so the expiry job can
-- compute "has 30 days passed" without relying on created_at (which is
-- when the ORIGINAL request was submitted, not when grace_period began —
-- those can be arbitrarily far apart if in_verification takes a while).
ALTER TABLE public.delete_account_requests
  ADD COLUMN IF NOT EXISTS grace_period_started_at TIMESTAMPTZ;

-- 2. Normalize any existing rows to the new vocabulary before the CHECK
-- constraint would reject them. Defensive only — every account-deletion
-- audit this session found 0 live rows in this table, so this is a
-- no-op in practice, not a real data migration.
UPDATE public.delete_account_requests SET status = 'pending_review' WHERE status = 'pending';
UPDATE public.delete_account_requests SET status = 'completed' WHERE status = 'approved';
UPDATE public.delete_account_requests SET status = 'cancelled' WHERE status = 'rejected';

-- 3. Enforce the vocabulary going forward.
ALTER TABLE public.delete_account_requests
  DROP CONSTRAINT IF EXISTS delete_account_requests_status_check;
ALTER TABLE public.delete_account_requests
  ADD CONSTRAINT delete_account_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending_review'::text,
    'in_verification'::text,
    'grace_period'::text,
    'completed'::text,
    'cancelled'::text
  ]));
ALTER TABLE public.delete_account_requests
  ALTER COLUMN status SET DEFAULT 'pending_review';

-- 4. Real per-status counts for DeleteRequestStats.tsx (was 5 fully
-- hardcoded KpiCard values).
CREATE OR REPLACE FUNCTION public.get_delete_account_request_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'pending_review', count(*) FILTER (WHERE status = 'pending_review'),
    'in_verification', count(*) FILTER (WHERE status = 'in_verification'),
    'grace_period', count(*) FILTER (WHERE status = 'grace_period'),
    'completed', count(*) FILTER (WHERE status = 'completed'),
    'cancelled', count(*) FILTER (WHERE status = 'cancelled'),
    'total', count(*)
  )
  FROM public.delete_account_requests;
$$;

REVOKE ALL ON FUNCTION public.get_delete_account_request_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_delete_account_request_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_delete_account_request_stats() TO authenticated, service_role;

-- 5. Grace-period expiry (21.4) — auto-transitions grace_period ->
-- completed once the window elapses, and anonymizes the account's app
-- data at that point (not earlier — grace_period is meant to be
-- reversible, so profile data must stay intact until the window truly
-- expires).
--
-- ⚠️ SCOPE, READ BEFORE RELYING ON THIS: this only anonymizes
-- public.user_profiles fields owned by this application. It deliberately
-- does NOT touch auth.users or public.user.email — scrubbing the actual
-- login email is a separate, higher-stakes policy decision (it affects
-- whether the same email can ever sign up again, and mutating Supabase's
-- own auth.users table directly carries more risk than this app's own
-- tables) that shouldn't be decided unilaterally in this migration. If
-- full "right to be forgotten" email erasure is a real compliance
-- requirement, that needs its own explicitly-reviewed migration.
--
-- Also does not hard-delete the delete_account_requests row itself — kept
-- for the "Completed: N all time" stat and for audit trail.
CREATE OR REPLACE FUNCTION public.expire_delete_account_grace_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  processed_count INT := 0;
BEGIN
  FOR rec IN
    SELECT id, user_id
    FROM public.delete_account_requests
    WHERE status = 'grace_period'
      AND grace_period_started_at IS NOT NULL
      AND grace_period_started_at <= now() - INTERVAL '30 days'
  LOOP
    UPDATE public.user_profiles
    SET
      first_name = 'Deleted',
      last_name = 'User',
      -- phone_number is NOT NULL, so a placeholder rather than NULL.
      phone_number = 'deleted',
      avatar_url = NULL,
      dob = NULL,
      sex = NULL,
      notes = NULL,
      expo_push_token = NULL,
      status = 'banned',
      deleted_at = now()
    WHERE user_id = rec.user_id;

    UPDATE public.delete_account_requests
    SET status = 'completed'
    WHERE id = rec.id;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', processed_count);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM anon;
REVOKE ALL ON FUNCTION public.expire_delete_account_grace_periods() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_delete_account_grace_periods() TO service_role;
