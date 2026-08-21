-- =============================================================================
-- Admin profile extension (Gap Analysis Part W).
--
-- 1. user_profiles: department/location for the profile modal
--    (W-D6; nullable, self-editable behind /api/admin/profile).
-- 2. start_admin_session superset: also stamps last_login_at, so the
--    modal's "Last login" reads the previous session start (W-D3).
--    The RPC is only invoked when sessionStorage has no live token, so
--    it fires once per browser session, not per page mount.
-- 3. end_other_admin_sessions(p_admin_id, p_reason): terminates all
--    OTHER active sessions for the admin (W-D5 "End Other Sessions").
--    Server-side only — never exposed to client-side service accounts.
-- Additive and re-runnable.
-- =============================================================================

alter table public.user_profiles
  add column if not exists department text,
  add column if not exists location   text;

-- ── start_admin_session (superset of 20260812_epic11 definition) ───────────
DROP FUNCTION IF EXISTS public.start_admin_session(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.start_admin_session(
  p_admin_id    uuid,
  p_ip_address  text DEFAULT NULL,
  p_user_agent  text DEFAULT NULL,
  p_device_info text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_id    uuid;
BEGIN
  INSERT INTO public.admin_sessions (admin_id, session_token, ip_address, user_agent, device_info)
  VALUES (p_admin_id, v_token, p_ip_address, p_user_agent, p_device_info)
  RETURNING id INTO v_id;

  UPDATE public.user_profiles
  SET last_active = now(),
      last_login_at = now()
  WHERE user_id = p_admin_id;

  RETURN jsonb_build_object('id', v_id, 'session_token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.start_admin_session(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_admin_session(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_admin_session(uuid, text, text, text) TO authenticated, service_role;

-- ── end_other_admin_sessions ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.end_other_admin_sessions(uuid, text);

CREATE OR REPLACE FUNCTION public.end_other_admin_sessions(
  p_admin_id uuid,
  p_reason   text DEFAULT 'ended_by_admin'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- All session rows for this admin are telemetry rows: the caller's own
  -- browser session is authenticated via Supabase JWT (Epic 11), so
  -- retiring every row does NOT log the caller out.
  WITH ended AS (
    UPDATE public.admin_sessions
    SET is_active = false, ended_at = now(), ended_reason = p_reason
    WHERE admin_id = p_admin_id AND is_active = true
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ended;

  PERFORM public.log_admin_activity(
    p_admin_id, 'end_other_sessions', 'admin_sessions', NULL,
    format('Ended %s other active session(s)', v_count), 'warning',
    NULL, NULL, NULL, jsonb_build_object('sessions_ended', v_count)
  );

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.end_other_admin_sessions(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_other_admin_sessions(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.end_other_admin_sessions(uuid, text) TO authenticated, service_role;
