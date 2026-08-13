-- Reconciliation migration — captures fixes applied directly to the live
-- database (via the Supabase MCP connector) while verifying/applying
-- 20260813_epic22_admin_task_manager.sql and 20260813_epic12_user_management.sql,
-- so this migrations directory stays a faithful record of live schema
-- state (a fresh DB rebuilt from these files should match production).
-- Nothing here is new work — it documents what was already applied.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. admin_sessions / content_moderation_flags were both missing the
-- updated_at column their own updated_at-touching trigger
-- (update_updated_at_column()) expected — meaning any UPDATE on either
-- table had been silently failing (trigger error) since the trigger was
-- attached, including moderate_content()'s own UPDATE ... SET status=...
-- on content_moderation_flags. Found and fixed live before this migration
-- was written back to disk.
--
-- A broader system-wide scan (not fixed here, flagged for a separate,
-- explicitly-scoped pass) found the identical defect on 9 more
-- public-schema tables: admin_activity_logs (harmless — zero writers
-- anywhere, see Epic 11.6's notes), bed_tracker_facilities,
-- bed_tracker_alerts, collector_submissions,
-- notification_automation_rules, platform_metrics_snapshots,
-- facility_scout_referrals, transaction_records, job_applications — all
-- owned by deferred new-feature epics (23, 24, 27, 30, 15, 26). UPDATE has
-- likely always silently failed on all of them; worth a dedicated fix
-- before any of those epics starts writing to them.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.content_moderation_flags
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. moderate_content() has always assigned bare text 'dismissed'/
-- 'actioned' to content_moderation_flags.status, but that column is a
-- moderation_status enum whose real labels are pending_review/approved/
-- rejected/flagged/escalated/auto_moderated — neither literal is a valid
-- label. This predates this session's Epic 12 work (present in Epic 29's
-- original version too) — every dismiss/warn/remove/ban action had always
-- failed, for every content type, not just the new 'profile' branch added
-- in Epic 12. Fixed mapping: dismiss -> rejected, warn/remove/ban ->
-- approved, with an explicit ::moderation_status cast.
--
-- This file's CREATE OR REPLACE reflects that fix directly (it super­sedes
-- 20260812_epic29_ai_analytics_and_moderation.sql's and
-- 20260813_epic12_user_management.sql's versions of this function — those
-- files are left as originally authored for history, this is the
-- corrected, currently-live definition).
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.moderate_content(uuid, text, text);
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
    WHEN p_action = 'dismiss' THEN 'rejected'
    WHEN p_action = 'warn'    THEN 'approved'
    WHEN p_action = 'remove'  THEN 'approved'
    WHEN p_action = 'ban'     THEN 'approved'
  END;

  UPDATE public.content_moderation_flags
  SET
    status       = v_new_status::moderation_status,
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
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_content(uuid, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.moderate_content(uuid, text, uuid, text) TO authenticated, service_role;
