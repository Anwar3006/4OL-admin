-- Migration: Anti screen-reading & anti-AI-scraping protocol (Gap Analysis Part AK)
--
-- Backend half of the five-layer protocol (see GAP_ANALYSIS Part AK):
--   L2 environment trust  -> security_device_signals + device_attestation_log
--   L4 attribution        -> security_canaries
--   L5 backend enforcement-> admin_read_audit (read auditing + anomaly trip),
--                             bot_signals, enforce_read_quota (per-user read
--                             quotas reusing rate_limit_counters)
--
-- All writes flow through SECURITY DEFINER RPCs keyed to auth.uid(); every
-- table has RLS enabled with owner-only SELECT where a UI will eventually
-- read it, and no direct INSERT/UPDATE policies — a scraped session token
-- cannot poison the telemetry tables with someone else's rows.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Device trust signals (AK-D2)
-- ────────────────────────────────────────────────────────────────────────────
-- One row per reported device/environment event from the mobile app
-- (device_profile, emulator_detected, masked_value_revealed, ...) and any
-- future web-side signals. Alerting queries key off signal_type.

CREATE TABLE IF NOT EXISTS public.security_device_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_device_signals_type_recent
  ON public.security_device_signals (signal_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_device_signals_user
  ON public.security_device_signals (user_id, created_at DESC);

ALTER TABLE public.security_device_signals ENABLE ROW LEVEL SECURITY;
-- No table policies: writes only via the RPC below; reads via service role
-- (security dashboards) until an RLS-scoped view is needed.

CREATE OR REPLACE FUNCTION public.report_device_signal(
  p_signal_type text,
  p_detail jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN; -- anonymous reports dropped silently, never an error
  END IF;
  INSERT INTO public.security_device_signals (user_id, signal_type, detail)
  VALUES (auth.uid(), p_signal_type, COALESCE(p_detail, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.report_device_signal(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_device_signal(text, jsonb) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Device attestation log (AK-D3, phase 1 fail-open telemetry)
-- ────────────────────────────────────────────────────────────────────────────
-- Records whether each session COULD produce a Play Integrity / App Attest
-- token. Two weeks of this telemetry tells us how much real traffic would
-- be cut off before enforcement is flipped on.

CREATE TABLE IF NOT EXISTS public.device_attestation_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  platform       text NOT NULL,
  token_present  boolean NOT NULL DEFAULT false,
  mechanism      text NOT NULL DEFAULT 'none',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_attestation_log_recent
  ON public.device_attestation_log (created_at DESC);

ALTER TABLE public.device_attestation_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_device_attestation(
  p_platform text,
  p_token_present boolean,
  p_mechanism text DEFAULT 'none'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.device_attestation_log (user_id, platform, token_present, mechanism)
  VALUES (auth.uid(), p_platform, p_token_present, p_mechanism);
END;
$$;

REVOKE ALL ON FUNCTION public.log_device_attestation(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_device_attestation(text, boolean, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Bot / automation signals (AK-D8)
-- ────────────────────────────────────────────────────────────────────────────
-- Browser-side automation indicators from the admin panel (webdriver flags,
-- headless fingerprints, copy-event telemetry, read anomalies raised by
-- log_admin_read below). Owner-readable so a future Security > Signals page
-- can list them through plain RLS.

CREATE TABLE IF NOT EXISTS public.bot_signals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  kind       text NOT NULL,
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_signals_admin_recent
  ON public.bot_signals (admin_id, created_at DESC);

ALTER TABLE public.bot_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_signals_owner_select ON public.bot_signals;
CREATE POLICY bot_signals_owner_select ON public.bot_signals
  FOR SELECT USING (auth.uid() = admin_id);

GRANT SELECT ON public.bot_signals TO authenticated;

CREATE OR REPLACE FUNCTION public.report_bot_signal(
  p_kind text,
  p_detail jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.bot_signals (admin_id, kind, detail)
  VALUES (auth.uid(), p_kind, COALESCE(p_detail, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.report_bot_signal(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_bot_signal(text, jsonb) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Admin read audit + anomaly trip (AK-D9)
-- ────────────────────────────────────────────────────────────────────────────
-- Every data-bearing /api/admin read logs one row here. The same RPC counts
-- the caller's reads in the trailing hour and raises a bot_signal when the
-- volume crosses READ_ANOMALY_THRESHOLD — the bulk-export / "AI agent paging
-- through everything" pattern.

CREATE TABLE IF NOT EXISTS public.admin_read_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  route_key  text NOT NULL,
  row_count  integer NOT NULL DEFAULT 0,
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_read_audit_admin_recent
  ON public.admin_read_audit (admin_id, created_at DESC);

ALTER TABLE public.admin_read_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_read_audit_owner_select ON public.admin_read_audit;
CREATE POLICY admin_read_audit_owner_select ON public.admin_read_audit
  FOR SELECT USING (auth.uid() = admin_id);

GRANT SELECT ON public.admin_read_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_read(
  p_route_key text,
  p_row_count integer DEFAULT 0,
  p_detail jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reads_last_hour integer;
  v_anomalous boolean := false;
  -- Reads per trailing hour beyond which a session is flagged. Sized for
  -- the panel's normal usage (paginated lists, dashboards); an agent
  -- walking every module blows through this within minutes.
  READ_ANOMALY_THRESHOLD constant integer := 200;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_read_audit (admin_id, route_key, row_count, detail)
  VALUES (auth.uid(), p_route_key, GREATEST(COALESCE(p_row_count, 0), 0),
          COALESCE(p_detail, '{}'::jsonb));

  SELECT COUNT(*) INTO v_reads_last_hour
  FROM public.admin_read_audit
  WHERE admin_id = auth.uid()
    AND created_at > now() - interval '1 hour';

  IF v_reads_last_hour > READ_ANOMALY_THRESHOLD THEN
    v_anomalous := true;
    INSERT INTO public.bot_signals (admin_id, kind, detail)
    VALUES (auth.uid(), 'read_anomaly',
            jsonb_build_object(
              'route_key', p_route_key,
              'reads_last_hour', v_reads_last_hour,
              'threshold', READ_ANOMALY_THRESHOLD
            ));
  END IF;

  RETURN v_anomalous;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_read(text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_read(text, integer, jsonb) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Canary tokens (AK-D7)
-- ────────────────────────────────────────────────────────────────────────────
-- Per-user decoy identifiers hidden in the DOM and in API payloads. If the
-- token ever resurfaces (paste it into report_canary_hit when a leak is
-- found — or automate that search later), hit_at + owner identify the exact
-- session that leaked, even when the leak is an LLM summary.

CREATE TABLE IF NOT EXISTS public.security_canaries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  context    text NOT NULL,
  token      text NOT NULL UNIQUE,
  issued_at  timestamptz NOT NULL DEFAULT now(),
  hit_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_security_canaries_owner
  ON public.security_canaries (owner_id, issued_at DESC);

ALTER TABLE public.security_canaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_canaries_owner_select ON public.security_canaries;
CREATE POLICY security_canaries_owner_select ON public.security_canaries
  FOR SELECT USING (auth.uid() = owner_id);

GRANT SELECT ON public.security_canaries TO authenticated;

-- Issues (or re-issues the latest) canary for the caller's context.
CREATE OR REPLACE FUNCTION public.issue_canary(
  p_context text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Reuse the freshest un-hit token per (owner, context) so repeated page
  -- loads don't flood the table.
  SELECT token INTO v_token
  FROM public.security_canaries
  WHERE owner_id = auth.uid()
    AND context = p_context
    AND hit_at IS NULL
  ORDER BY issued_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(16), 'hex');
    INSERT INTO public.security_canaries (owner_id, context, token)
    VALUES (auth.uid(), p_context, v_token);
  END IF;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_canary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_canary(text) TO authenticated;

-- Records a leak attribution hit. Callable by any authenticated user: the
-- token may surface in a leak discovered through a different account.
CREATE OR REPLACE FUNCTION public.report_canary_hit(
  p_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  UPDATE public.security_canaries
  SET hit_at = now()
  WHERE token = p_token
    AND hit_at IS NULL
  RETURNING owner_id INTO v_owner;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.bot_signals (admin_id, kind, detail)
    VALUES (v_owner, 'canary_hit', jsonb_build_object('token', p_token));
  END IF;

  RETURN v_owner; -- NULL when token unknown or already hit
END;
$$;

REVOKE ALL ON FUNCTION public.report_canary_hit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_canary_hit(text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Per-user read quotas (AK-D5)
-- ────────────────────────────────────────────────────────────────────────────
-- Authenticated wrapper over the existing fixed-window limiter, keyed to the
-- caller so no user can burn or inspect someone else's counter. Sensitive
-- mobile RPCs call this at the top:
--
--   IF NOT (SELECT allowed FROM public.enforce_read_quota('chats/messages', 60, 120)) THEN
--     RAISE EXCEPTION 'rate_limited';
--   END IF;
--
-- Wiring into each existing RPC is tracked as follow-up task AK-D5.2 (the
-- RPC bodies live in earlier migrations and get one guard line each).

CREATE OR REPLACE FUNCTION public.enforce_read_quota(
  p_route_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 60;
    RETURN;
  END IF;

  SELECT r.allowed, r.retry_after_seconds INTO v_result
  FROM public.check_and_increment_rate_limit(
    auth.uid(), p_route_key, p_window_seconds, p_max_requests
  ) r;

  RETURN QUERY SELECT v_result.allowed, v_result.retry_after_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_read_quota(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_read_quota(text, integer, integer) TO authenticated;
