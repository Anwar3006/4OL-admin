-- Migration: User Flagging
-- Description: Adds moderation flag fields to user_profiles, mirroring the
-- existing is_flagged/flagged_reason/flagged_at/flagged_by pattern already
-- used on conversations and messages (see schema.sql).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS flagged_by uuid;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_flagged_by_fkey
  FOREIGN KEY (flagged_by) REFERENCES public.user_profiles(user_id);

-- Speeds up the Flagged Users tab's `WHERE is_flagged = true` query.
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_flagged
  ON public.user_profiles (is_flagged)
  WHERE is_flagged = true;
