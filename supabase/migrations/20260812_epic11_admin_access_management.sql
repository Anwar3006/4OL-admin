-- Epic 11: Admin & Access Management — real admin metrics, session telemetry,
-- and a shared admin-activity logging primitive.
--
-- ─────────────────────────────────────────────────────────────────────────
-- Why `activity_logs`, not `admin_activity_logs`:
-- `admin_activity_logs` (admin_id uuid, action_type <enum>, ip_address,
-- severity, session_id) already exists and is already read by
-- app/api/security/audit-logs/route.ts — but nothing anywhere in either
-- repo has ever INSERTed into it, and action_type is a Postgres enum whose
-- live label set can't be confirmed without DB access (no CREATE TYPE
-- statement exists in any schema dump in this repo). Guessing enum labels
-- risks a hard runtime failure on every insert.
-- `activity_logs` (actor_id text, action_type **text**, target_table,
-- record_id, old_data/new_data) is the table half a dozen existing RPCs
-- (facility/user admin mutations) already write to successfully, with
-- 1,731+ real rows per Epic 10.5. Extending this proven table with the
-- handful of columns admin_activity_logs has that it doesn't (severity,
-- ip_address, user_agent, session_id) is safe (additive, nullable/defaulted,
-- doesn't touch any existing INSERT statement) and gives Epic 11/28's
-- audit-log stories one real, already-populated source of truth instead of
-- resurrecting a second, riskier, still-empty table.
-- `admin_activity_logs` itself is left untouched (not dropped — out of
-- scope, not breaking anything) but should be considered dead/superseded.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON public.activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs(actor_id);

-- ─────────────────────────────────────────────────────────────────────────
-- log_admin_activity — shared primitive any admin-panel mutation can call
-- to record a real audit-trail row instead of leaving activity_logs
-- admin-blind. Resolves actor_name server-side so callers don't need to.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.log_admin_activity(uuid, text, text, text, text, text, text, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_admin_id     uuid,
  p_action_type  text,
  p_target_table text,
  p_record_id    text DEFAULT NULL,
  p_description  text DEFAULT NULL,
  p_severity     text DEFAULT 'info',
  p_ip_address   text DEFAULT NULL,
  p_user_agent   text DEFAULT NULL,
  p_old_data     jsonb DEFAULT NULL,
  p_new_data     jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_id         uuid;
BEGIN
  SELECT trim(concat_ws(' ', first_name, last_name)) INTO v_actor_name
  FROM public.user_profiles WHERE user_id = p_admin_id;

  INSERT INTO public.activity_logs (
    actor_id, actor_name, action_type, target_table, record_id,
    old_data, new_data, severity, ip_address, user_agent
  )
  VALUES (
    p_admin_id::text, coalesce(v_actor_name, 'Unknown Admin'), p_action_type,
    p_target_table, p_record_id, p_old_data,
    CASE WHEN p_description IS NOT NULL
      THEN coalesce(p_new_data, '{}'::jsonb) || jsonb_build_object('description', p_description)
      ELSE p_new_data END,
    p_severity, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_activity(uuid, text, text, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_admin_activity(uuid, text, text, text, text, text, text, text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(uuid, text, text, text, text, text, text, text, jsonb, jsonb) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin session telemetry (11.3) — admin_sessions already exists as a
-- table with zero writers anywhere in the codebase.
-- ─────────────────────────────────────────────────────────────────────────

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

  UPDATE public.user_profiles SET last_active = now() WHERE user_id = p_admin_id;

  RETURN jsonb_build_object('id', v_id, 'session_token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.start_admin_session(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_admin_session(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_admin_session(uuid, text, text, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_session_heartbeat(text);

CREATE OR REPLACE FUNCTION public.admin_session_heartbeat(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  UPDATE public.admin_sessions
  SET last_active_at = now()
  WHERE session_token = p_session_token AND is_active = true
  RETURNING admin_id INTO v_admin_id;

  IF v_admin_id IS NOT NULL THEN
    UPDATE public.user_profiles SET last_active = now() WHERE user_id = v_admin_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_session_heartbeat(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_session_heartbeat(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_session_heartbeat(text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.end_admin_session(text, text);

CREATE OR REPLACE FUNCTION public.end_admin_session(p_session_token text, p_reason text DEFAULT 'logout')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_sessions
  SET is_active = false, ended_at = now(), ended_reason = p_reason
  WHERE session_token = p_session_token AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.end_admin_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_admin_session(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.end_admin_session(text, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- get_admin_dashboard_metrics(time_filter) — 11.1
--
-- "Pending" admins is sourced from user_invites (unused/unexpired invite
-- rows with an admin role), NOT user_profiles.status — invited admins have
-- no user_profiles row at all until they accept. This mirrors the real
-- accept-invite flow, not the fake 'pending' status value the old
-- getUsers() analytics reducer assumed existed (user_profiles.status's
-- real CHECK vocabulary is active/inactive/suspended/banned/
-- pending_verification — 'pending' has never been a valid value here).
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_admin_dashboard_metrics(text);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(time_filter text DEFAULT '30d')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz;
  admin_roles text[] := ARRAY['admin', 'super_admin', 'registrar'];
BEGIN
  since := CASE time_filter
    WHEN '24h' THEN now() - interval '24 hours'
    WHEN '7d'  THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    WHEN '90d' THEN now() - interval '90 days'
    ELSE now() - interval '30 days'
  END;

  RETURN (
    WITH admins AS (
      SELECT * FROM public.user_profiles WHERE role = ANY(admin_roles)
    ),
    admin_totals AS (
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'active')::int AS active,
        count(*) FILTER (WHERE status = 'inactive')::int AS inactive,
        count(*) FILTER (WHERE status = 'suspended')::int AS suspended,
        count(*) FILTER (WHERE status = 'banned')::int AS banned,
        count(*) FILTER (WHERE NOT coalesce(mfa_enabled, false))::int AS mfa_not_set,
        count(DISTINCT s.admin_id) FILTER (
          WHERE s.is_active AND s.last_active_at >= now() - interval '15 minutes'
        )::int AS online_now
      FROM admins a
      LEFT JOIN public.admin_sessions s ON s.admin_id = a.user_id
    ),
    role_breakdown AS (
      SELECT coalesce(jsonb_object_agg(role, cnt), '{}'::jsonb) AS data
      FROM (SELECT role, count(*)::int AS cnt FROM admins GROUP BY role) r
    ),
    pending_invites AS (
      SELECT count(*)::int AS pending
      FROM public.user_invites
      WHERE role = ANY(admin_roles)
        AND used_at IS NULL
        AND NOT coalesce(is_revoked, false)
        AND expires_at > now()
    ),
    admin_ids AS (
      SELECT user_id::text AS id FROM admins
    ),
    window_logs AS (
      SELECT * FROM public.activity_logs
      WHERE created_at >= since AND actor_id IN (SELECT id FROM admin_ids)
    ),
    activity_totals AS (
      SELECT
        count(*)::int AS total_actions,
        count(*) FILTER (WHERE severity = 'critical')::int AS critical_events,
        count(*) FILTER (WHERE severity = 'warning')::int AS high_risk_actions
      FROM window_logs
    ),
    most_active AS (
      SELECT actor_name, count(*)::int AS cnt
      FROM window_logs
      GROUP BY actor_name
      ORDER BY cnt DESC
      LIMIT 1
    ),
    peak_hour AS (
      SELECT extract(hour FROM created_at AT TIME ZONE 'Africa/Accra')::int AS hr, count(*) AS cnt
      FROM window_logs
      GROUP BY hr
      ORDER BY cnt DESC
      LIMIT 1
    ),
    recent_activity AS (
      SELECT coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb) AS data
      FROM (
        SELECT id, actor_name, action_type, target_table, record_id, severity, created_at
        FROM window_logs
        ORDER BY created_at DESC
        LIMIT 10
      ) l
    )
    SELECT jsonb_build_object(
      'time_filter', time_filter,
      'admins', jsonb_build_object(
        'total', admin_totals.total,
        'active', admin_totals.active,
        'inactive', admin_totals.inactive,
        'suspended', admin_totals.suspended,
        'banned', admin_totals.banned,
        'pending', pending_invites.pending,
        'mfa_not_set', admin_totals.mfa_not_set,
        'online_now', admin_totals.online_now,
        'by_role', role_breakdown.data
      ),
      'activity', jsonb_build_object(
        'total_actions', activity_totals.total_actions,
        'critical_events', activity_totals.critical_events,
        'high_risk_actions', activity_totals.high_risk_actions,
        'most_active_admin', (SELECT actor_name FROM most_active),
        'peak_hour', (SELECT hr FROM peak_hour),
        'recent', recent_activity.data
      )
    )
    FROM admin_totals, role_breakdown, pending_invites, activity_totals, recent_activity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(text) TO authenticated, service_role;
