-- =============================================================================
-- ROLLBACK for 20260926110000_af02_feedback_board.sql
-- =============================================================================
-- Reverses AF-02 Feedback Board. Functions first, then triggers, tables, enums.
-- pg_trgm extension is intentionally LEFT installed (shared with the drug
-- catalog trigram matching — dropping it would break unrelated features).
--
-- DESTRUCTIVE: drops all feedback_* tables and their rows. Dry-run in a
-- rolled-back transaction on prod before applying (repo convention).
-- =============================================================================

-- 1. Functions
DROP FUNCTION IF EXISTS public.get_feedback_kpi_stats();
DROP FUNCTION IF EXISTS public.admin_convert_review_to_post(uuid);
DROP FUNCTION IF EXISTS public.admin_reply_feedback_post(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_feedback_status(uuid, public.feedback_status, text);
DROP FUNCTION IF EXISTS public.admin_moderate_feedback_post(uuid, public.feedback_visibility, boolean);
DROP FUNCTION IF EXISTS public.reply_feedback_post(uuid, text);
DROP FUNCTION IF EXISTS public.get_feedback_post(uuid);
DROP FUNCTION IF EXISTS public.get_feedback_board(public.feedback_category, public.feedback_status, text, text, boolean, integer, integer);
DROP FUNCTION IF EXISTS public.flag_feedback_post(uuid, text);
DROP FUNCTION IF EXISTS public.watch_feedback_post(uuid);
DROP FUNCTION IF EXISTS public.vote_feedback_post(uuid);
DROP FUNCTION IF EXISTS public.submit_feedback_post(public.feedback_category, text, text, smallint, text, boolean, text, text, text);
DROP FUNCTION IF EXISTS public.feedback_posts_touch_updated_at();

-- 2. Triggers
DROP TRIGGER IF EXISTS trg_feedback_posts_touch ON public.feedback_posts;

-- 3. Tables
DROP TABLE IF EXISTS public.feedback_watchers;
DROP TABLE IF EXISTS public.feedback_flags;
DROP TABLE IF EXISTS public.feedback_replies;
DROP TABLE IF EXISTS public.feedback_votes;
DROP TABLE IF EXISTS public.feedback_posts;

-- 4. Enums last
DROP TYPE IF EXISTS public.feedback_visibility;
DROP TYPE IF EXISTS public.feedback_status;
DROP TYPE IF EXISTS public.feedback_category;
