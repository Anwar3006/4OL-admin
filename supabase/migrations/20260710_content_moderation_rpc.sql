-- =============================================================================
-- Content Moderation RPCs
-- =============================================================================
-- Fetches all flagged content (messages + conversations) joined with
-- moderation flag details from content_moderation_flags.
-- Returns a unified result set with content_type, content_id, preview,
-- reporter info, flag reason, AI detection data, and moderation status.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_flagged_content()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  WITH flagged_messages AS (
    SELECT
      'message' AS content_type,
      m.id::text AS content_id, -- Cast to text to align with UNION and content_moderation_flags
      LEFT(m.content, 200) AS content_preview,
      m.created_at AS content_created_at,
      m.sender_id,
      up.first_name AS sender_first_name,
      up.last_name AS sender_last_name,
      c.name AS conversation_name,
      c.id AS conversation_id,
      cmf.id AS flag_id,
      cmf.reported_by,
      reporter.first_name AS reporter_first_name,
      reporter.last_name AS reporter_last_name,
      cmf.report_reason,
      cmf.report_detail,
      cmf.ai_detected,
      cmf.ai_confidence,
      cmf.ai_reason,
      cmf.status AS moderation_status,
      cmf.reviewed_by,
      cmf.action_taken,
      cmf.action_notes,
      cmf.created_at AS flagged_at
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    LEFT JOIN public.user_profiles up ON up.user_id = m.sender_id
    JOIN public.content_moderation_flags cmf
      ON cmf.content_type = 'message'
      AND cmf.content_id = m.id::text
    LEFT JOIN public.user_profiles reporter ON reporter.user_id = cmf.reported_by
    WHERE m.is_flagged = true
      AND m.is_deleted = false
  ),
  flagged_conversations AS (
    SELECT
      'conversation' AS content_type,
      c.id::text AS content_id, -- Cast to text to match flagged_messages
      LEFT(c.name, 200) AS content_preview,
      c.created_at AS content_created_at,
      c.created_by AS sender_id,
      creator.first_name AS sender_first_name,
      creator.last_name AS sender_last_name,
      c.name AS conversation_name,
      c.id AS conversation_id,
      cmf.id AS flag_id,
      cmf.reported_by,
      reporter.first_name AS reporter_first_name,
      reporter.last_name AS reporter_last_name,
      cmf.report_reason,
      cmf.report_detail,
      cmf.ai_detected,
      cmf.ai_confidence,
      cmf.ai_reason,
      cmf.status AS moderation_status,
      cmf.reviewed_by,
      cmf.action_taken,
      cmf.action_notes,
      cmf.created_at AS flagged_at
    FROM public.conversations c
    LEFT JOIN public.user_profiles creator ON creator.user_id = c.created_by
    JOIN public.content_moderation_flags cmf
      ON cmf.content_type = 'conversation'
      AND cmf.content_id = c.id::text
    LEFT JOIN public.user_profiles reporter ON reporter.user_id = cmf.reported_by
    WHERE c.is_flagged = true
      AND c.is_deleted = false
  ),
  unioned AS (
    SELECT * FROM flagged_messages
    UNION ALL
    SELECT * FROM flagged_conversations
  )
  SELECT COALESCE(json_agg(row_to_json(u) ORDER BY u.flagged_at DESC), '[]'::json) INTO result
  FROM unioned u;

  RETURN result;
END;
$$;

-- =============================================================================
-- moderate_content(
--   p_flag_id       uuid   – the content_moderation_flags.id
--   p_action        text   – 'dismiss' | 'warn' | 'remove' | 'ban'
--   p_action_notes  text   – optional moderator notes
-- )
-- =============================================================================
CREATE OR REPLACE FUNCTION moderate_content(
  p_flag_id      uuid,
  p_action       text,
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
  -- Validate action
  IF p_action NOT IN ('dismiss', 'warn', 'remove', 'ban') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be one of: dismiss, warn, remove, ban', p_action;
  END IF;

  -- Get the flag record
  SELECT cmf.content_type, cmf.content_id
  INTO v_content_type, v_content_id
  FROM public.content_moderation_flags cmf
  WHERE cmf.id = p_flag_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flag % not found', p_flag_id;
  END IF;

  -- Determine new status
  v_new_status := CASE
    WHEN p_action = 'dismiss' THEN 'dismissed'
    WHEN p_action = 'warn'    THEN 'actioned'
    WHEN p_action = 'remove'  THEN 'actioned'
    WHEN p_action = 'ban'     THEN 'actioned'
  END;

  -- 1. Update the moderation flag
  UPDATE public.content_moderation_flags
  SET
    status       = v_new_status,
    action_taken = p_action,
    action_notes = COALESCE(p_action_notes, action_notes),
    reviewed_by  = COALESCE(auth.uid(), reviewed_by),
    reviewed_at  = NOW()
  WHERE id = p_flag_id;

  -- 2. Update the source row
  IF v_content_type = 'message' THEN
    IF p_action = 'dismiss' THEN
      UPDATE public.messages
      SET is_flagged = false
      WHERE id = v_content_id::uuid;
    ELSIF p_action = 'remove' THEN
      UPDATE public.messages
      SET is_flagged = false, is_deleted = true
      WHERE id = v_content_id::uuid;
    END IF;
  ELSIF v_content_type = 'conversation' THEN
    IF p_action = 'dismiss' THEN
      UPDATE public.conversations
      SET is_flagged = false
      WHERE id = v_content_id::uuid;
    ELSIF p_action = 'remove' THEN
      UPDATE public.conversations
      SET is_flagged = false, is_deleted = true
      WHERE id = v_content_id::uuid;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_flagged_content() TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_content(uuid, text, text) TO authenticated;