-- Epic 12: User Management — get_user_dashboard_metrics RPC.
--
-- "Active" is defined as last_active within the selected window (12.3),
-- not status = 'active' — a user can have status='active' and never have
-- opened the app since account creation. "Flagged" (12.4) is backed by
-- content_moderation_flags with content_type = 'profile' — that content_type
-- value already exists in the table's CHECK constraint (added alongside
-- message/conversation/facility_review/forum_post/comment) but nothing has
-- ever written it; this migration doesn't change that fact, it just gives
-- the real (currently zero) count instead of a hardcoded one. "Premium"
-- (12.5) sources user_subscriptions only — will read 0 until Epic 16 ships
-- real subscription rows, which is the honest state, not a placeholder.

DROP FUNCTION IF EXISTS public.get_user_dashboard_metrics(text);

CREATE OR REPLACE FUNCTION public.get_user_dashboard_metrics(time_filter text DEFAULT '30d')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz;
BEGIN
  since := CASE time_filter
    WHEN '24h' THEN now() - interval '24 hours'
    WHEN '7d'  THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    WHEN '90d' THEN now() - interval '90 days'
    ELSE now() - interval '30 days'
  END;

  RETURN (
    WITH base AS (
      SELECT * FROM public.user_profiles WHERE role = 'user'
    ),
    totals AS (
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE last_active >= since)::int AS active,
        count(*) FILTER (WHERE created_at >= since)::int AS new_users,
        count(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted,
        count(*) FILTER (WHERE status = 'pending_verification')::int AS pending_verification,
        count(*) FILTER (WHERE status = 'suspended')::int AS suspended,
        count(*) FILTER (WHERE status = 'banned')::int AS banned,
        count(*) FILTER (WHERE expo_push_token IS NOT NULL)::int AS with_push_token,
        count(*) FILTER (WHERE has_completed_fitness_onboarding)::int AS fitness_onboarded
      FROM base
    ),
    by_type AS (
      SELECT coalesce(jsonb_object_agg(user_type, cnt), '{}'::jsonb) AS data
      FROM (SELECT user_type, count(*)::int AS cnt FROM base GROUP BY user_type) t
    ),
    by_sex AS (
      SELECT coalesce(jsonb_object_agg(coalesce(sex, 'unspecified'), cnt), '{}'::jsonb) AS data
      FROM (SELECT sex, count(*)::int AS cnt FROM base GROUP BY sex) t
    ),
    premium AS (
      SELECT count(DISTINCT us.user_id)::int AS cnt
      FROM public.user_subscriptions us
      JOIN base b ON b.user_id = us.user_id
      WHERE us.status = 'active'
    ),
    flagged AS (
      SELECT count(*)::int AS cnt
      FROM public.content_moderation_flags
      WHERE content_type = 'profile' AND status = 'pending_review'
    ),
    delete_requests AS (
      SELECT count(*)::int AS cnt
      FROM public.delete_account_requests
      WHERE status IN ('pending_review', 'in_verification')
    )
    SELECT jsonb_build_object(
      'time_filter', time_filter,
      'total', totals.total,
      'active', totals.active,
      'new_users', totals.new_users,
      'deleted', totals.deleted,
      'pending_verification', totals.pending_verification,
      'suspended', totals.suspended,
      'banned', totals.banned,
      'with_push_token', totals.with_push_token,
      'fitness_onboarding_rate', CASE WHEN totals.total = 0 THEN 0
        ELSE round((totals.fitness_onboarded::numeric / totals.total) * 100) END,
      'premium', premium.cnt,
      'flagged', flagged.cnt,
      'delete_requests_pending', delete_requests.cnt,
      'by_type', by_type.data,
      'by_sex', by_sex.data
    )
    FROM totals, by_type, by_sex, premium, flagged, delete_requests
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_dashboard_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_dashboard_metrics(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_metrics(text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Extend moderate_content() to actually act on flagged user profiles.
-- Epic 29.5 left a note that its 'ban' action only updated the flag's own
-- status, not the flagged content's author, because resolving "the
-- author" per content_type wasn't done yet. For content_type = 'profile',
-- content_id IS the user_id directly — no resolution needed — so this is
-- the first content_type where "ban" can be wired all the way through.
-- Reuses the exact ban pattern already established in
-- useDeleteAccountRequests.ts (public.user.banned + user_profiles.status).
-- 'remove' on a profile flag suspends the account (softer than ban) since
-- there's no "content" to delete for a profile the way there is a message.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.moderate_content(uuid, text, uuid, text);

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
  ELSIF v_content_type = 'profile' THEN
    IF p_action = 'remove' THEN
      UPDATE public.user_profiles SET status = 'suspended' WHERE user_id = v_content_id::uuid;
    ELSIF p_action = 'ban' THEN
      UPDATE public.user_profiles SET status = 'banned' WHERE user_id = v_content_id::uuid;
      UPDATE public.user SET banned = true WHERE id = v_content_id;
    END IF;
  END IF;

  -- p_action = 'ban' on message/conversation flags intentionally has no
  -- source-row effect here — those content_types still need their
  -- author's user_id resolved per content_type before a ban can be wired
  -- through (message/conversation authorship isn't on the flag row
  -- itself); real follow-up, not guessed at.
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.moderate_content(uuid, text, uuid, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- create_profile_flag — the admin-side "Flag User" action
-- (flag-user-dialog.tsx) was previously a pure UI mock (TODO comment,
-- fake setTimeout, no backend call at all). This is the write path for
-- it, mirroring app/api/chat/moderation/route.ts's pattern but for admins
-- flagging a user directly rather than a user reporting chat content.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.create_profile_flag(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_profile_flag(
  p_user_id   uuid,
  p_admin_id  uuid,
  p_reason    text,
  p_detail    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.content_moderation_flags (
    content_type, content_id, reported_by, report_reason, report_detail
  )
  VALUES ('profile', p_user_id::text, p_admin_id, p_reason, p_detail)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_flag(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_profile_flag(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_profile_flag(uuid, uuid, text, text) TO authenticated, service_role;
