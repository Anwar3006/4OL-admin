-- Migration: Message/Conversation moderation flag sync
-- Description: content_moderation_flags is now the single source of truth
-- for moderation reports across content types (message, conversation,
-- facility_review, forum_post, profile, comment). Per-row `is_flagged`
-- columns on messages/conversations are kept as fast-lookup denormalized
-- flags (e.g. for DataTable filtering without a join), synced here via
-- trigger on INSERT rather than maintained by the application.

-- content_moderation_flags.content_type previously only allowed:
-- 'message', 'facility_review', 'forum_post', 'profile', 'comment'.
-- Add 'conversation' so group chats can be flagged/reported too.
ALTER TABLE public.content_moderation_flags
  DROP CONSTRAINT IF EXISTS content_moderation_flags_content_type_check;

ALTER TABLE public.content_moderation_flags
  ADD CONSTRAINT content_moderation_flags_content_type_check
  CHECK (
    content_type = ANY (
      ARRAY[
        'message'::text,
        'conversation'::text,
        'facility_review'::text,
        'forum_post'::text,
        'profile'::text,
        'comment'::text
      ]
    )
  );

-- Sync trigger: on every new moderation flag, denormalize is_flagged (and
-- the reason/who/when, where the target table has matching columns) onto
-- the flagged row itself. content_moderation_flags.content_id is `text`
-- (since it fans out across multiple tables), so it's cast to uuid here —
-- wrapped in a sub-block so a malformed content_id on an unrelated
-- content_type never blocks the flag insert itself.
CREATE OR REPLACE FUNCTION fn_sync_moderation_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    IF NEW.content_type = 'message' THEN
      UPDATE public.messages
      SET
        is_flagged = true,
        flag_reason = COALESCE(flag_reason, NEW.report_reason)
      WHERE id = NEW.content_id::uuid;
    ELSIF NEW.content_type = 'conversation' THEN
      UPDATE public.conversations
      SET
        is_flagged = true,
        flagged_reason = COALESCE(flagged_reason, NEW.report_reason),
        flagged_at = COALESCE(flagged_at, NEW.created_at),
        flagged_by = COALESCE(flagged_by, NEW.reported_by)
      WHERE id = NEW.content_id::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE WARNING
      'fn_sync_moderation_flag: content_id "%" is not a valid uuid for content_type "%" (flag row % still inserted)',
      NEW.content_id, NEW.content_type, NEW.id;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_moderation_flag ON public.content_moderation_flags;

CREATE TRIGGER trg_sync_moderation_flag
AFTER INSERT ON public.content_moderation_flags
FOR EACH ROW
EXECUTE FUNCTION fn_sync_moderation_flag();

-- NOTE: this only handles the create path (report -> flag denormalized to
-- true). Resetting is_flagged back to false when a flag is reviewed and
-- dismissed (content_moderation_flags.status -> 'dismissed'/'resolved')
-- is intentionally out of scope here — that belongs with the admin
-- Flagged-tab review/resolve endpoint, not the report-creation trigger.
