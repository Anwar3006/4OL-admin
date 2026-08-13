-- Epic 29: AI Hub analytics RPC + a real bug fix in the moderation action RPC.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. get_ai_analytics(time_filter) — consolidates what /api/ai/metrics and
-- /api/ai/analytics currently each compute independently in JS after a
-- raw `.limit(1000)` row fetch from fitness_ai_calls. That cap is a real
-- correctness bug, not just a style preference: once AI call volume in a
-- given window exceeds 1000 rows, totals/averages/success-rate silently
-- undercount rather than reflecting the full window. Aggregating in SQL
-- removes the cap entirely and gives both routes one shared source of
-- truth instead of two independent (and already slightly divergent) JS
-- implementations of the same aggregation.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_ai_analytics(text);

CREATE OR REPLACE FUNCTION public.get_ai_analytics(time_filter text DEFAULT '24h')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz;
BEGIN
  since := CASE time_filter
    WHEN '1h' THEN now() - interval '1 hour'
    WHEN '24h' THEN now() - interval '24 hours'
    WHEN '7d' THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    ELSE now() - interval '24 hours'
  END;

  RETURN (
    WITH calls AS (
      SELECT * FROM public.fitness_ai_calls WHERE created_at >= since
    ),
    call_totals AS (
      SELECT
        count(*)::int AS total_requests,
        coalesce(sum(token_usage), 0)::bigint AS total_tokens,
        coalesce(sum(estimated_cost), 0)::numeric AS total_cost,
        coalesce(round(avg(response_time_ms)), 0)::int AS avg_latency,
        count(*) FILTER (WHERE status = 'success')::int AS successful,
        count(*) FILTER (WHERE status IS DISTINCT FROM 'success')::int AS errors,
        count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_users
      FROM calls
    ),
    by_model AS (
      SELECT coalesce(jsonb_object_agg(
        model_name, jsonb_build_object(
          'requests', requests,
          'tokens', tokens,
          'avgLatency', avg_latency
        )
      ), '{}'::jsonb) AS data
      FROM (
        SELECT
          coalesce(model_name, 'unknown') AS model_name,
          count(*)::int AS requests,
          coalesce(sum(token_usage), 0)::bigint AS tokens,
          coalesce(round(avg(response_time_ms)), 0)::int AS avg_latency
        FROM calls
        GROUP BY coalesce(model_name, 'unknown')
      ) grouped
    ),
    flags AS (
      SELECT * FROM public.content_moderation_flags WHERE created_at >= since
    ),
    flag_totals AS (
      SELECT
        count(*)::int AS total_flags,
        count(*) FILTER (WHERE ai_detected)::int AS ai_detected,
        count(*) FILTER (WHERE status = 'pending_review')::int AS pending,
        coalesce(round(avg(ai_confidence) FILTER (WHERE ai_detected)), 0)::int AS avg_confidence
      FROM flags
    )
    SELECT jsonb_build_object(
      'time_filter', time_filter,
      'total_requests', call_totals.total_requests,
      'total_tokens', call_totals.total_tokens,
      'total_cost', call_totals.total_cost,
      'avg_latency', call_totals.avg_latency,
      'success_rate', CASE WHEN call_totals.total_requests = 0 THEN 0
        ELSE round((call_totals.successful::numeric / call_totals.total_requests) * 100) END,
      'errors', call_totals.errors,
      'unique_users', call_totals.unique_users,
      'by_model', by_model.data,
      'moderation', jsonb_build_object(
        'flags', flag_totals.total_flags,
        'ai_detected', flag_totals.ai_detected,
        'pending', flag_totals.pending,
        'avg_confidence', flag_totals.avg_confidence
      )
    )
    FROM call_totals, by_model, flag_totals
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_ai_analytics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_analytics(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ai_analytics(text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Fix moderate_content() — it sets `reviewed_by = COALESCE(auth.uid(),
-- reviewed_by)`, but its only caller (app/api/ai/moderation-queue/route.ts)
-- invokes it via a service-role client, which has no JWT/auth context —
-- auth.uid() always evaluates to NULL there. So every moderation action
-- taken through the admin UI would silently record no reviewer at all.
-- Not previously visible because nothing called this RPC from any UI
-- button until this same pass wires the Moderation tab's actions up.
-- Fixed by accepting the acting admin's id explicitly instead of relying
-- on session-derived auth.uid().
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.moderate_content(uuid, text, text);

CREATE OR REPLACE FUNCTION public.moderate_content(
  p_flag_id      uuid,
  p_action       text,
  p_admin_id     uuid DEFAULT NULL,
  p_action_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_type text;
  v_content_id   text;
  v_new_status   text;
BEGIN
  IF p_action NOT IN ('dismiss', 'warn', 'remove', 'ban') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be one of: dismiss, warn, remove, ban', p_action;
  END IF;

  SELECT cmf.content_type, cmf.content_id
  INTO v_content_type, v_content_id
  FROM public.content_moderation_flags cmf
  WHERE cmf.id = p_flag_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flag % not found', p_flag_id;
  END IF;

  v_new_status := CASE
    WHEN p_action = 'dismiss' THEN 'dismissed'
    WHEN p_action = 'warn'    THEN 'actioned'
    WHEN p_action = 'remove'  THEN 'actioned'
    WHEN p_action = 'ban'     THEN 'actioned'
  END;

  UPDATE public.content_moderation_flags
  SET
    status       = v_new_status,
    action_taken = p_action,
    action_notes = COALESCE(p_action_notes, action_notes),
    reviewed_by  = COALESCE(p_admin_id, auth.uid(), reviewed_by),
    reviewed_at  = NOW()
  WHERE id = p_flag_id;

  IF v_content_type = 'message' THEN
    IF p_action = 'dismiss' THEN
      UPDATE public.messages SET is_flagged = false WHERE id = v_content_id::uuid;
    ELSIF p_action = 'remove' THEN
      UPDATE public.messages SET is_flagged = false, is_deleted = true WHERE id = v_content_id::uuid;
    END IF;
  ELSIF v_content_type = 'conversation' THEN
    IF p_action = 'dismiss' THEN
      UPDATE public.conversations SET is_flagged = false WHERE id = v_content_id::uuid;
    ELSIF p_action = 'remove' THEN
      UPDATE public.conversations SET is_flagged = false, is_deleted = true WHERE id = v_content_id::uuid;
    END IF;
  END IF;

  -- p_action = 'ban' intentionally has no source-row effect here — banning
  -- a user is a bigger, separate action (see useDeleteAccountRequests.ts's
  -- own ban-on-grace_period logic for the established pattern: sets
  -- public.user.banned + user_profiles.status = 'banned'). Wiring "ban"
  -- through this RPC to actually ban the flagged content's author is real
  -- follow-up work, not done here — flagged rather than guessed at, since
  -- it needs the author's user_id resolved per content_type first.
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.moderate_content(uuid, text, uuid, text) TO authenticated, service_role;
