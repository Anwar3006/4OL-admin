-- =============================================================================
-- App Reviews — periodic in-app rating pipeline (GAP_ANALYSIS Part AC)
-- =============================================================================
-- Closes the Reviews & Ratings gap where the admin mockup's "App" review
-- target (admin-panel.html L6674-6767) had no schema, no RPCs and no admin
-- surface, and the mobile app had only a manual store deep-link in Settings.
--
-- Shipped here:
--   1. app_reviews table (rating + comment + device context + moderation state)
--   2. user_profiles.last_review_prompt_at — server-side monthly throttle
--   3. RLS on app_reviews (admin read/update; writes only via RPC)
--   4. Mobile RPCs: get_app_review_prompt_state / submit_app_review /
--      record_app_review_prompt — all throttle server-side (≥30 days)
--   5. Admin RPCs: admin_moderate_app_review / get_app_review_kpi_stats
--
-- Additive and re-runnable: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY
-- IF EXISTS before CREATE. Depends on public.request_user_id() +
-- public.is_app_admin() from 20260819_backfill_untracked_top_rated_objects.sql
-- and the live review_status enum (pending/approved/rejected).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text text,
  app_version text,
  platform text,                       -- 'ios' | 'android' | 'web'
  prompt_source text NOT NULL DEFAULT 'periodic_modal', -- or 'settings_manual'
  status public.review_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_reviews_user_created
  ON public.app_reviews (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_reviews_status
  ON public.app_reviews (status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Prompt throttle column (authoritative monthly cadence lives server-side)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_review_prompt_at timestamptz;

-- -----------------------------------------------------------------------------
-- 3. RLS — admins read/update; users never touch the table directly
--    (their write path is the SECURITY DEFINER submit_app_review RPC).
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_reviews_admin_select" ON public.app_reviews;
CREATE POLICY "app_reviews_admin_select"
ON public.app_reviews
FOR SELECT
TO authenticated
USING (public.is_app_admin());

DROP POLICY IF EXISTS "app_reviews_admin_update" ON public.app_reviews;
CREATE POLICY "app_reviews_admin_update"
ON public.app_reviews
FOR UPDATE
TO authenticated
USING (public.is_app_admin())
WITH CHECK (public.is_app_admin());

GRANT SELECT, UPDATE ON public.app_reviews TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Mobile RPC — prompt eligibility (server decides; client only mirrors)
--    Prompt only when: account ≥30 days old AND no prompt AND no submitted
--    review within the last 30 days.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_review_prompt_state()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_last_prompt timestamptz;
  v_last_review timestamptz;
  v_account_age_ok boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('should_prompt', false, 'reason', 'unauthenticated');
  END IF;

  SELECT up.last_review_prompt_at, (up.created_at <= now() - interval '30 days')
  INTO v_last_prompt, v_account_age_ok
  FROM public.user_profiles up
  WHERE up.user_id = v_uid;

  SELECT max(created_at) INTO v_last_review
  FROM public.app_reviews
  WHERE user_id = v_uid;

  RETURN json_build_object(
    'should_prompt',
      coalesce(v_account_age_ok, false)
      AND (v_last_prompt IS NULL OR v_last_prompt <= now() - interval '30 days')
      AND (v_last_review IS NULL OR v_last_review <= now() - interval '30 days'),
    'last_prompted_at', v_last_prompt,
    'last_reviewed_at', v_last_review
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Mobile RPC — submit review (enforces the 30-day re-review cap R-D5)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_app_review(
  p_rating integer,
  p_comment_text text DEFAULT NULL,
  p_app_version text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_prompt_source text DEFAULT 'periodic_modal'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Server-side monthly cap — authoritative regardless of client state.
  IF EXISTS (
    SELECT 1 FROM public.app_reviews
    WHERE user_id = v_uid AND created_at > now() - interval '30 days'
  ) THEN
    RAISE EXCEPTION 'You have already reviewed the app within the last 30 days';
  END IF;

  INSERT INTO public.app_reviews (user_id, rating, comment_text, app_version, platform, prompt_source)
  VALUES (v_uid, p_rating, nullif(trim(coalesce(p_comment_text, '')), ''), p_app_version, p_platform, coalesce(p_prompt_source, 'periodic_modal'))
  RETURNING id INTO v_id;

  -- A submitted review also counts as this month's prompt.
  UPDATE public.user_profiles
  SET last_review_prompt_at = now()
  WHERE user_id = v_uid;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Mobile RPC — record prompt shown/dismissed (starts the 30-day clock so a
--    dismissed modal never reappears within the month)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_app_review_prompt(p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action NOT IN ('shown', 'dismissed', 'submitted') THEN
    RAISE EXCEPTION 'Invalid prompt action: %', coalesce(p_action, 'null');
  END IF;

  UPDATE public.user_profiles
  SET last_review_prompt_at = now()
  WHERE user_id = v_uid;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Admin RPC — moderation (approve/reject + note), epic30 authorization pattern
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderate_app_review(
  p_review_id uuid,
  p_status public.review_status,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.app_reviews
  SET status = p_status,
      admin_note = p_note,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_review_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Admin RPC — KPI strip for the App Reviews tab (30-day deltas like the
--    facility get_review_kpi_stats shape)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_review_kpi_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_curr_start timestamptz := now() - interval '30 days';
  v_prev_start timestamptz := now() - interval '60 days';
  v_tot_curr int; v_tot_prev int; v_tot_delta numeric;
  v_avg numeric; v_pending int; v_low int;
BEGIN
  SELECT count(*) INTO v_tot_curr FROM public.app_reviews WHERE created_at >= v_curr_start;
  SELECT count(*) INTO v_tot_prev FROM public.app_reviews WHERE created_at >= v_prev_start AND created_at < v_curr_start;
  v_tot_delta := CASE WHEN v_tot_prev = 0 THEN 0 ELSE round(((v_tot_curr - v_tot_prev)::numeric / v_tot_prev) * 100, 1) END;

  SELECT coalesce(round(avg(rating)::numeric, 1), 0) INTO v_avg FROM public.app_reviews;
  SELECT count(*) INTO v_pending FROM public.app_reviews WHERE status = 'pending';
  SELECT count(*) INTO v_low FROM public.app_reviews WHERE rating <= 2;

  RETURN json_build_object(
    'total_reviews', (SELECT count(*) FROM public.app_reviews),
    'total_delta', v_tot_delta,
    'average_rating', v_avg,
    'pending_reviews', v_pending,
    'low_rating_reviews', v_low
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. Grants — mobile RPCs callable by their own authenticated session only;
--    moderation/KPI RPCs keep the epic30 REVOKE-public pattern.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_app_review_prompt_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_review_prompt_state() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_app_review(integer, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_app_review(integer, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_app_review_prompt(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_review_prompt(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_moderate_app_review(uuid, public.review_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_app_review(uuid, public.review_status, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_app_review_kpi_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_review_kpi_stats() TO authenticated, service_role;
