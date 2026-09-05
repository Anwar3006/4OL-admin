-- Re-applies 20260812_epic21_delete_account_status_vocabulary.sql, which was
-- authored, committed, and never landed in the database.
--
-- How it presented: /delete-account-request logged
--   POST /rest/v1/rpc/get_delete_account_request_stats -> 404 (PGRST202)
-- and the page's five KPI cards rendered nothing.
--
-- What was actually missing, checked against information_schema rather than
-- assumed from the one visible symptom:
--
--   grace_period_started_at            column absent
--   status CHECK constraint            absent (old vocabulary still allowed)
--   status DEFAULT                     still 'pending', not 'pending_review'
--   get_delete_account_request_stats   absent
--
-- expire_delete_account_grace_periods DID exist and reads
-- grace_period_started_at, so that function has been broken since it was
-- created — a half-applied migration, not a missing one. Worth checking the
-- whole file rather than only the part that threw.
--
-- delete_account_requests has 0 rows, so the UPDATEs below are no-ops in
-- practice and the CHECK cannot reject existing data.

ALTER TABLE public.delete_account_requests
  ADD COLUMN IF NOT EXISTS grace_period_started_at TIMESTAMPTZ;

UPDATE public.delete_account_requests SET status = 'pending_review' WHERE status = 'pending';
UPDATE public.delete_account_requests SET status = 'completed'      WHERE status = 'approved';
UPDATE public.delete_account_requests SET status = 'cancelled'      WHERE status = 'rejected';

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

CREATE OR REPLACE FUNCTION public.get_delete_account_request_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'pending_review',  count(*) FILTER (WHERE status = 'pending_review'),
    'in_verification', count(*) FILTER (WHERE status = 'in_verification'),
    'grace_period',    count(*) FILTER (WHERE status = 'grace_period'),
    'completed',       count(*) FILTER (WHERE status = 'completed'),
    'cancelled',       count(*) FILTER (WHERE status = 'cancelled'),
    'total',           count(*)
  )
  FROM public.delete_account_requests;
$$;

REVOKE ALL ON FUNCTION public.get_delete_account_request_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_delete_account_request_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_delete_account_request_stats() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
