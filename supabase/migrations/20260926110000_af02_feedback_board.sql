-- =============================================================================
-- AF-02 — Feedback Board (Reviews, Suggestions & Recommendations)
-- =============================================================================
-- A public in-app Canny-style board: users post reviews/suggestions/bugs,
-- vote, watch, and see ideas move through a visible status pipeline.
--
-- Mirrors 20260822_app_reviews.sql conventions exactly (RLS via is_app_admin,
-- SECURITY DEFINER RPCs, request_user_id caller resolution, epic30 GRANTs).
-- RLS-complete from day one — the facility_reviews no-RLS gap is the explicit
-- anti-pattern this avoids.
--
-- Shipped here:
--   1. Enums: feedback_category / feedback_status / feedback_visibility
--   2. Tables: feedback_posts (+ denormalised vote_count/flag_count),
--      feedback_votes, feedback_replies, feedback_flags, feedback_watchers
--   3. RLS: users read published (+ own any state), insert own, vote/watch own
--   4. Mobile RPCs: submit_feedback_post (3/day rate-limit + dedup + auto-pass),
--      vote_feedback_post, watch_feedback_post, get_feedback_board,
--      get_feedback_post, reply_feedback_post, flag_feedback_post
--   5. Admin RPCs: admin_moderate_feedback_post, admin_set_feedback_status
--      (fires watcher push via dispatch_notification), admin_reply_feedback_post,
--      admin_convert_review_to_post, get_feedback_kpi_stats
--
-- Additive + re-runnable. Depends on: public.user_profiles, public.app_reviews,
--   public.request_user_id(), public.is_app_admin(), public.dispatch_notification().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- similarity() for the fuzzy dedup guard

DO $$ BEGIN
  CREATE TYPE public.feedback_category AS ENUM
    ('review','suggestion','recommendation','bug','praise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.feedback_status AS ENUM
    ('open','under_review','planned','in_progress','shipped','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.feedback_visibility AS ENUM
    ('published','pending','hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  category public.feedback_category NOT NULL DEFAULT 'suggestion',
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  module text,                          -- app area: Plasence, Fitness, ...
  status public.feedback_status NOT NULL DEFAULT 'open',
  status_note text,                     -- public staff note ("Shipped in v2.4")
  status_changed_at timestamptz,
  status_changed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  vote_count integer NOT NULL DEFAULT 0,
  is_anonymous boolean NOT NULL DEFAULT false,
  visibility public.feedback_visibility NOT NULL DEFAULT 'pending',
  flag_count integer NOT NULL DEFAULT 0,
  app_version text,
  platform text,
  source text NOT NULL DEFAULT 'board', -- board | rate_modal | admin_convert
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_rating_only_for_review
    CHECK (category <> 'review' OR rating IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.feedback_votes (
  post_id uuid NOT NULL REFERENCES public.feedback_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feedback_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feedback_posts(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_user_id)
);

CREATE TABLE IF NOT EXISTS public.feedback_watchers (
  post_id uuid NOT NULL REFERENCES public.feedback_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_posts_board
  ON public.feedback_posts (visibility, status, vote_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_posts_user
  ON public.feedback_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_post
  ON public.feedback_replies (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_watchers_user
  ON public.feedback_watchers (user_id);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.feedback_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_watchers ENABLE ROW LEVEL SECURITY;

-- posts: published to everyone authenticated; own posts in any state; admins all.
DROP POLICY IF EXISTS feedback_posts_select ON public.feedback_posts;
CREATE POLICY feedback_posts_select ON public.feedback_posts
FOR SELECT TO authenticated
USING (
  visibility = 'published'
  OR user_id = nullif(public.request_user_id(), '')::uuid
  OR public.is_app_admin()
);
-- Users never write posts directly (submit RPC is the path), but allow INSERT
-- of own row so the SECURITY DEFINER RPC and any direct client insert both work.
DROP POLICY IF EXISTS feedback_posts_insert ON public.feedback_posts;
CREATE POLICY feedback_posts_insert ON public.feedback_posts
FOR INSERT TO authenticated
WITH CHECK (user_id = nullif(public.request_user_id(), '')::uuid);
DROP POLICY IF EXISTS feedback_posts_admin_update ON public.feedback_posts;
CREATE POLICY feedback_posts_admin_update ON public.feedback_posts
FOR UPDATE TO authenticated
USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS feedback_votes_own ON public.feedback_votes;
CREATE POLICY feedback_votes_own ON public.feedback_votes
FOR ALL TO authenticated
USING (user_id = nullif(public.request_user_id(), '')::uuid OR public.is_app_admin())
WITH CHECK (user_id = nullif(public.request_user_id(), '')::uuid);

-- replies: readable when the parent post is readable; writes via RPC.
DROP POLICY IF EXISTS feedback_replies_select ON public.feedback_replies;
CREATE POLICY feedback_replies_select ON public.feedback_replies
FOR SELECT TO authenticated
USING (
  is_staff
  OR author_user_id = nullif(public.request_user_id(), '')::uuid
  OR public.is_app_admin()
  OR EXISTS (SELECT 1 FROM public.feedback_posts p
             WHERE p.id = post_id AND p.visibility = 'published')
);
DROP POLICY IF EXISTS feedback_replies_insert ON public.feedback_replies;
CREATE POLICY feedback_replies_insert ON public.feedback_replies
FOR INSERT TO authenticated
WITH CHECK (author_user_id = nullif(public.request_user_id(), '')::uuid OR public.is_app_admin());

DROP POLICY IF EXISTS feedback_flags_own ON public.feedback_flags;
CREATE POLICY feedback_flags_own ON public.feedback_flags
FOR ALL TO authenticated
USING (reporter_user_id = nullif(public.request_user_id(), '')::uuid OR public.is_app_admin())
WITH CHECK (reporter_user_id = nullif(public.request_user_id(), '')::uuid);

DROP POLICY IF EXISTS feedback_watchers_own ON public.feedback_watchers;
CREATE POLICY feedback_watchers_own ON public.feedback_watchers
FOR ALL TO authenticated
USING (user_id = nullif(public.request_user_id(), '')::uuid OR public.is_app_admin())
WITH CHECK (user_id = nullif(public.request_user_id(), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON public.feedback_posts TO service_role;
GRANT SELECT, INSERT, DELETE ON public.feedback_votes TO service_role;
GRANT SELECT, INSERT, DELETE ON public.feedback_replies TO service_role;
GRANT SELECT, INSERT, DELETE ON public.feedback_flags TO service_role;
GRANT SELECT, INSERT, DELETE ON public.feedback_watchers TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Mobile RPC — submit (rate-limit 3/day + fuzzy dedup + auto-pass heuristic)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_feedback_post(
  p_category public.feedback_category,
  p_title text,
  p_body text,
  p_rating smallint DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_is_anonymous boolean DEFAULT false,
  p_app_version text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_source text DEFAULT 'board'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_visibility public.feedback_visibility;
  v_today int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF char_length(v_title) < 3 THEN RAISE EXCEPTION 'Title too short'; END IF;
  IF char_length(v_body) < 1 THEN RAISE EXCEPTION 'Body is required'; END IF;
  IF p_category = 'review' AND (p_rating IS NULL OR p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Reviews require a 1-5 rating';
  END IF;

  -- Rate limit: max 3 posts per rolling day.
  SELECT count(*) INTO v_today FROM public.feedback_posts
  WHERE user_id = v_uid AND created_at > now() - interval '1 day';
  IF v_today >= 3 THEN
    RAISE EXCEPTION 'Daily post limit reached (3/day). Try again tomorrow.';
  END IF;

  -- Fuzzy duplicate guard: same author, near-identical title in last 7 days.
  IF EXISTS (
    SELECT 1 FROM public.feedback_posts
    WHERE user_id = v_uid
      AND created_at > now() - interval '7 days'
      AND similarity(lower(title), lower(v_title)) > 0.6
  ) THEN
    RAISE EXCEPTION 'You already posted something very similar recently';
  END IF;

  -- Auto-pass heuristic: substantive posts publish immediately; thin ones await
  -- moderation. (Profanity/spam review runs in the admin moderation queue.)
  v_visibility := CASE WHEN char_length(v_body) >= 20 AND char_length(v_title) >= 6
                       THEN 'published' ELSE 'pending' END;

  INSERT INTO public.feedback_posts
    (user_id, category, title, body, rating, module, is_anonymous, visibility,
     app_version, platform, source)
  VALUES
    (v_uid, p_category, v_title, v_body, p_rating, nullif(trim(coalesce(p_module,'')),''),
     coalesce(p_is_anonymous,false), v_visibility, p_app_version, p_platform,
     coalesce(p_source,'board'))
  RETURNING id INTO v_id;

  -- Author auto-watches their own post.
  INSERT INTO public.feedback_watchers (post_id, user_id)
  VALUES (v_id, v_uid) ON CONFLICT DO NOTHING;

  RETURN json_build_object('ok', true, 'id', v_id, 'visibility', v_visibility);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Mobile RPC — vote (toggle) + watch (toggle)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vote_feedback_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_exists boolean;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.feedback_votes
                WHERE post_id = p_post_id AND user_id = v_uid) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.feedback_votes WHERE post_id = p_post_id AND user_id = v_uid;
  ELSE
    -- Votes require an account at least 1 day old (anti-brigading).
    IF EXISTS (SELECT 1 FROM public.user_profiles
               WHERE user_id = v_uid AND created_at > now() - interval '1 day') THEN
      RAISE EXCEPTION 'Your account is too new to vote';
    END IF;
    INSERT INTO public.feedback_votes (post_id, user_id) VALUES (p_post_id, v_uid);
  END IF;

  UPDATE public.feedback_posts
  SET vote_count = (SELECT count(*) FROM public.feedback_votes WHERE post_id = p_post_id),
      updated_at = now()
  WHERE id = p_post_id
  RETURNING vote_count INTO v_count;

  RETURN json_build_object('ok', true, 'voted', NOT v_exists, 'vote_count', coalesce(v_count,0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.watch_feedback_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.feedback_watchers
                WHERE post_id = p_post_id AND user_id = v_uid) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.feedback_watchers WHERE post_id = p_post_id AND user_id = v_uid;
  ELSE
    INSERT INTO public.feedback_watchers (post_id, user_id) VALUES (p_post_id, v_uid);
  END IF;

  RETURN json_build_object('ok', true, 'watching', NOT v_exists);
END;
$function$;

CREATE OR REPLACE FUNCTION public.flag_feedback_post(p_post_id uuid, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_flags int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.feedback_flags (post_id, reporter_user_id, reason)
  VALUES (p_post_id, v_uid, nullif(trim(coalesce(p_reason,'')),''))
  ON CONFLICT (post_id, reporter_user_id) DO NOTHING;

  UPDATE public.feedback_posts
  SET flag_count = (SELECT count(*) FROM public.feedback_flags WHERE post_id = p_post_id)
  WHERE id = p_post_id
  RETURNING flag_count INTO v_flags;

  -- Auto-hide at threshold pending moderation.
  IF coalesce(v_flags,0) >= 3 THEN
    UPDATE public.feedback_posts SET visibility = 'hidden' WHERE id = p_post_id;
  END IF;

  RETURN json_build_object('ok', true, 'flag_count', coalesce(v_flags,0));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Mobile RPC — board list (filter/sort/paginate; published + own only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feedback_board(
  p_category public.feedback_category DEFAULT NULL,
  p_status public.feedback_status DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_sort text DEFAULT 'top',            -- top | new | status
  p_mine boolean DEFAULT false,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_limit int := least(greatest(coalesce(p_limit,30),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN json_build_object(
    'posts', coalesce((
      SELECT json_agg(row_to_json(x)) FROM (
        SELECT p.id, p.category,
               CASE WHEN p.is_anonymous THEN NULL ELSE p.user_id END AS user_id,
               p.title,
               left(p.body, 240) AS body_preview,
               p.rating, p.module, p.status, p.status_note,
               p.vote_count, p.flag_count, p.created_at,
               (p.user_id = v_uid) AS is_mine,
               EXISTS(SELECT 1 FROM public.feedback_votes v
                      WHERE v.post_id = p.id AND v.user_id = v_uid) AS voted,
               (SELECT count(*) FROM public.feedback_replies r WHERE r.post_id = p.id) AS reply_count
        FROM public.feedback_posts p
        WHERE (p.visibility = 'published' OR p.user_id = v_uid)
          AND (p_category IS NULL OR p.category = p_category)
          AND (p_status IS NULL OR p.status = p_status)
          AND (p_module IS NULL OR p.module = p_module)
          AND (p_mine = false OR p.user_id = v_uid)
        ORDER BY
          CASE WHEN p_sort = 'new' THEN p.created_at END DESC,
          CASE WHEN p_sort = 'top' THEN p.vote_count END DESC,
          p.created_at DESC
        LIMIT v_limit OFFSET v_offset
      ) x
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Mobile RPC — post detail (body + replies + own vote/watch state)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feedback_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_post public.feedback_posts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_post FROM public.feedback_posts WHERE id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found'; END IF;
  IF v_post.visibility <> 'published' AND v_post.user_id <> v_uid AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Post not available';
  END IF;

  RETURN json_build_object(
    'post', json_build_object(
      'id', v_post.id,
      'category', v_post.category,
      'user_id', CASE WHEN v_post.is_anonymous THEN NULL ELSE v_post.user_id END,
      'title', v_post.title, 'body', v_post.body, 'rating', v_post.rating,
      'module', v_post.module, 'status', v_post.status, 'status_note', v_post.status_note,
      'vote_count', v_post.vote_count, 'created_at', v_post.created_at,
      'is_mine', (v_post.user_id = v_uid),
      'voted', EXISTS(SELECT 1 FROM public.feedback_votes v WHERE v.post_id = p_post_id AND v.user_id = v_uid),
      'watching', EXISTS(SELECT 1 FROM public.feedback_watchers w WHERE w.post_id = p_post_id AND w.user_id = v_uid)
    ),
    'replies', coalesce((
      SELECT json_agg(json_build_object(
        'id', r.id,
        'author_user_id', CASE WHEN r.is_staff THEN NULL ELSE r.author_user_id END,
        'is_staff', r.is_staff, 'body', r.body, 'created_at', r.created_at
      ) ORDER BY r.created_at)
      FROM public.feedback_replies r WHERE r.post_id = p_post_id
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Mobile RPC — user reply
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reply_feedback_post(p_post_id uuid, p_body text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF char_length(trim(coalesce(p_body,''))) < 1 THEN RAISE EXCEPTION 'Reply is empty'; END IF;

  INSERT INTO public.feedback_replies (post_id, author_user_id, is_staff, body)
  VALUES (p_post_id, v_uid, false, trim(p_body))
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. Admin RPC — moderation (approve/hide + optional flag reset)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderate_feedback_post(
  p_post_id uuid,
  p_visibility public.feedback_visibility,
  p_reset_flags boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.feedback_posts
  SET visibility = p_visibility,
      flag_count = CASE WHEN p_reset_flags THEN 0 ELSE flag_count END,
      updated_at = now()
  WHERE id = p_post_id;

  IF p_reset_flags THEN
    DELETE FROM public.feedback_flags WHERE post_id = p_post_id;
  END IF;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 10. Admin RPC — set status (+ public note) and fire watcher notifications.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_feedback_status(
  p_post_id uuid,
  p_status public.feedback_status,
  p_status_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin uuid := nullif(public.request_user_id(), '')::uuid;
  v_post public.feedback_posts%ROWTYPE;
  v_recipients jsonb;
  v_notified int := 0;
  v_emoji text;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_post FROM public.feedback_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found'; END IF;

  UPDATE public.feedback_posts
  SET status = p_status,
      status_note = nullif(trim(coalesce(p_status_note,'')),''),
      status_changed_at = now(),
      status_changed_by = v_admin,
      updated_at = now()
  WHERE id = p_post_id;

  -- Build watcher recipient list (exclude the admin who made the change).
  v_emoji := CASE p_status
    WHEN 'planned' THEN ' 🎉' WHEN 'in_progress' THEN ' 🔨'
    WHEN 'shipped' THEN ' ✅' ELSE '' END;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id', w.user_id,
      'title', 'Update on your idea',
      'body', '"' || v_post.title || '" is now ' || replace(p_status::text,'_',' ') || v_emoji,
      'type', 'feedback_status',
      'metadata', jsonb_build_object('post_id', p_post_id, 'status', p_status)
    )), '[]'::jsonb)
  INTO v_recipients
  FROM public.feedback_watchers w
  WHERE w.post_id = p_post_id AND w.user_id <> v_admin;

  IF jsonb_array_length(v_recipients) > 0 THEN
    PERFORM public.dispatch_notification(v_recipients, NULL, 'consumer');
    v_notified := jsonb_array_length(v_recipients);
  END IF;

  RETURN json_build_object('ok', true, 'notified_watchers', v_notified);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 11. Admin RPC — staff reply (renders "4 Our Life Team" badge in-app)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reply_feedback_post(p_post_id uuid, p_body text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin uuid := nullif(public.request_user_id(), '')::uuid;
  v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF char_length(trim(coalesce(p_body,''))) < 1 THEN RAISE EXCEPTION 'Reply is empty'; END IF;

  INSERT INTO public.feedback_replies (post_id, author_user_id, is_staff, body)
  VALUES (p_post_id, v_admin, true, trim(p_body))
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 12. Admin RPC — convert a low-rating app_review into a tracked board post.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_convert_review_to_post(p_review_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin uuid := nullif(public.request_user_id(), '')::uuid;
  v_rev public.app_reviews%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_rev FROM public.app_reviews WHERE id = p_review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found'; END IF;

  INSERT INTO public.feedback_posts
    (user_id, category, title, body, rating, status, visibility, app_version, platform, source)
  VALUES
    (v_rev.user_id, 'bug',
     left(coalesce(nullif(trim(v_rev.comment_text),''), 'App review (' || v_rev.rating || '★)'), 140),
     coalesce(nullif(trim(v_rev.comment_text),''), '(no comment) — converted from a '
       || v_rev.rating || '★ app review'),
     v_rev.rating::smallint, 'open', 'pending',
     v_rev.app_version, v_rev.platform, 'admin_convert')
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'id', v_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 13. Admin RPC — KPI strip
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feedback_kpi_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_week timestamptz := now() - interval '7 days';
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'total_posts', (SELECT count(*) FROM public.feedback_posts),
    'posts_this_week', (SELECT count(*) FROM public.feedback_posts WHERE created_at >= v_week),
    'pending_moderation', (SELECT count(*) FROM public.feedback_posts WHERE visibility = 'pending'),
    'flagged', (SELECT count(*) FROM public.feedback_posts WHERE visibility = 'hidden'),
    'shipped', (SELECT count(*) FROM public.feedback_posts WHERE status = 'shipped'),
    'open_ideas', (SELECT count(*) FROM public.feedback_posts WHERE status = 'open' AND visibility = 'published'),
    'avg_review_rating', (SELECT coalesce(round(avg(rating)::numeric,1),0)
                          FROM public.feedback_posts WHERE category = 'review'),
    'top_voted', (SELECT coalesce(json_agg(json_build_object('id',id,'title',title,'vote_count',vote_count) ORDER BY vote_count DESC), '[]'::json)
                  FROM (SELECT id,title,vote_count FROM public.feedback_posts
                        WHERE visibility='published' AND status <> 'shipped'
                        ORDER BY vote_count DESC LIMIT 5) t)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 14. updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.feedback_posts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_feedback_posts_touch ON public.feedback_posts;
CREATE TRIGGER trg_feedback_posts_touch BEFORE UPDATE ON public.feedback_posts
FOR EACH ROW EXECUTE FUNCTION public.feedback_posts_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 15. Grants — epic30 pattern
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.submit_feedback_post(public.feedback_category, text, text, smallint, text, boolean, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback_post(public.feedback_category, text, text, smallint, text, boolean, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.vote_feedback_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_feedback_post(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.watch_feedback_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.watch_feedback_post(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.flag_feedback_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_feedback_post(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_feedback_board(public.feedback_category, public.feedback_status, text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_board(public.feedback_category, public.feedback_status, text, text, boolean, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_feedback_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_post(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reply_feedback_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_feedback_post(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_moderate_feedback_post(uuid, public.feedback_visibility, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_feedback_post(uuid, public.feedback_visibility, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_feedback_status(uuid, public.feedback_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_feedback_status(uuid, public.feedback_status, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_reply_feedback_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reply_feedback_post(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_convert_review_to_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_convert_review_to_post(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_feedback_kpi_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_kpi_stats() TO authenticated, service_role;
