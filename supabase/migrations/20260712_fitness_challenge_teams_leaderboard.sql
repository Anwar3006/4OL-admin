-- Migration: Fitness Challenge Teams, Entries & Leaderboards
-- Description: Fills three gaps needed by the redesigned mobile Challenges
-- screen (challenges.html mockup):
--   1. fitness_challenge_teams / participants.team_id — team rosters for
--      "Team" type challenges (e.g. "Team Push-Up Battle"), alongside the
--      existing purely-individual fitness_challenge_participants.
--   2. fitness_challenge_entries — per-day progress logs (e.g. "logged
--      5,000 steps today"). fitness_challenge_participants.progress_pct
--      already existed but had no source of truth feeding it; entries are
--      that source, kept in sync via trigger.
--   3. fitness_challenge_leaderboard / fitness_challenge_team_leaderboard —
--      ranked views (not denormalized tables) computed live from entries,
--      so ranking is always accurate with no sync-drift risk. Supabase
--      reads a view identically to a table via `.from(...)`, so this is
--      transparent to the app/admin dashboard.

-- ─────────────────────────────────────────────────────────────
-- 1. Teams
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fitness_challenge_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.fitness_challenges(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  captain_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  max_members integer DEFAULT 10,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fitness_challenge_teams_challenge
  ON public.fitness_challenge_teams (challenge_id);

-- Each participant optionally belongs to one team within their challenge.
-- Nullable — solo challenges never set this.
ALTER TABLE public.fitness_challenge_participants
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.fitness_challenge_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fitness_challenge_participants_team
  ON public.fitness_challenge_participants (team_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Progress entries (daily logs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fitness_challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.fitness_challenges(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.fitness_challenge_participants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL CHECK (value >= 0),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source = ANY (ARRAY['manual'::text, 'healthkit'::text, 'google_fit'::text, 'auto'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_challenge_entries_participant
  ON public.fitness_challenge_entries (participant_id);
CREATE INDEX IF NOT EXISTS idx_fitness_challenge_entries_challenge
  ON public.fitness_challenge_entries (challenge_id);
CREATE INDEX IF NOT EXISTS idx_fitness_challenge_entries_date
  ON public.fitness_challenge_entries (entry_date DESC);

-- ─────────────────────────────────────────────────────────────
-- 3a. Keep participants.progress_pct + challenges.completion_count synced
--     with entries (the actual logged values are the source of truth).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_challenge_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant_id uuid;
  v_challenge_id uuid;
  v_goal_value numeric;
  v_total numeric;
  v_pct numeric;
BEGIN
  v_participant_id := COALESCE(NEW.participant_id, OLD.participant_id);
  v_challenge_id := COALESCE(NEW.challenge_id, OLD.challenge_id);

  SELECT goal_value INTO v_goal_value
  FROM public.fitness_challenges WHERE id = v_challenge_id;

  SELECT COALESCE(SUM(value), 0) INTO v_total
  FROM public.fitness_challenge_entries
  WHERE participant_id = v_participant_id;

  v_pct := CASE
    WHEN v_goal_value IS NULL OR v_goal_value = 0 THEN 0
    ELSE LEAST(100, ROUND((v_total / v_goal_value) * 100, 2))
  END;

  UPDATE public.fitness_challenge_participants
  SET progress_pct = v_pct,
      status = CASE WHEN v_pct >= 100 THEN 'completed' ELSE status END
  WHERE id = v_participant_id;

  IF v_pct >= 100 THEN
    UPDATE public.fitness_challenges
    SET completion_count = (
      SELECT count(*) FROM public.fitness_challenge_participants
      WHERE challenge_id = v_challenge_id AND status = 'completed'
    )
    WHERE id = v_challenge_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_challenge_progress ON public.fitness_challenge_entries;
CREATE TRIGGER trg_sync_challenge_progress
AFTER INSERT OR UPDATE OR DELETE ON public.fitness_challenge_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_challenge_progress();

-- ─────────────────────────────────────────────────────────────
-- 3b. Keep fitness_challenges.current_participants synced
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_challenge_participant_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.fitness_challenges
  SET current_participants = (
    SELECT count(*) FROM public.fitness_challenge_participants
    WHERE challenge_id = COALESCE(NEW.challenge_id, OLD.challenge_id)
  )
  WHERE id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_challenge_participant_count ON public.fitness_challenge_participants;
CREATE TRIGGER trg_sync_challenge_participant_count
AFTER INSERT OR DELETE ON public.fitness_challenge_participants
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_challenge_participant_count();

-- ─────────────────────────────────────────────────────────────
-- 3c. Keep fitness_challenge_teams.member_count synced
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_team_member_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  IF v_team_id IS NOT NULL THEN
    UPDATE public.fitness_challenge_teams
    SET member_count = (
      SELECT count(*) FROM public.fitness_challenge_participants WHERE team_id = v_team_id
    ),
    updated_at = now()
    WHERE id = v_team_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.team_id IS DISTINCT FROM NEW.team_id AND OLD.team_id IS NOT NULL THEN
    UPDATE public.fitness_challenge_teams
    SET member_count = (
      SELECT count(*) FROM public.fitness_challenge_participants WHERE team_id = OLD.team_id
    ),
    updated_at = now()
    WHERE id = OLD.team_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_member_count ON public.fitness_challenge_participants;
CREATE TRIGGER trg_sync_team_member_count
AFTER INSERT OR UPDATE OF team_id OR DELETE ON public.fitness_challenge_participants
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_team_member_count();

-- ─────────────────────────────────────────────────────────────
-- 4a. Individual leaderboard view (per challenge)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.fitness_challenge_leaderboard AS
SELECT
  p.challenge_id,
  p.id AS participant_id,
  p.user_id,
  up.first_name,
  up.last_name,
  up.avatar_url,
  p.team_id,
  t.name AS team_name,
  COALESCE(SUM(e.value), 0) AS total_score,
  p.progress_pct,
  p.status,
  RANK() OVER (
    PARTITION BY p.challenge_id
    ORDER BY COALESCE(SUM(e.value), 0) DESC
  ) AS rank
FROM public.fitness_challenge_participants p
JOIN public.user_profiles up ON up.user_id = p.user_id
LEFT JOIN public.fitness_challenge_teams t ON t.id = p.team_id
LEFT JOIN public.fitness_challenge_entries e ON e.participant_id = p.id
GROUP BY
  p.challenge_id, p.id, p.user_id, up.first_name, up.last_name,
  up.avatar_url, p.team_id, t.name, p.progress_pct, p.status;

-- ─────────────────────────────────────────────────────────────
-- 4b. Team leaderboard view (per challenge)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.fitness_challenge_team_leaderboard AS
SELECT
  t.challenge_id,
  t.id AS team_id,
  t.name AS team_name,
  t.avatar_url,
  t.member_count,
  COALESCE(SUM(e.value), 0) AS total_score,
  RANK() OVER (
    PARTITION BY t.challenge_id
    ORDER BY COALESCE(SUM(e.value), 0) DESC
  ) AS rank
FROM public.fitness_challenge_teams t
LEFT JOIN public.fitness_challenge_participants p ON p.team_id = t.id
LEFT JOIN public.fitness_challenge_entries e ON e.participant_id = p.id
GROUP BY t.challenge_id, t.id, t.name, t.avatar_url, t.member_count;

GRANT SELECT ON public.fitness_challenge_leaderboard TO authenticated, anon, service_role;
GRANT SELECT ON public.fitness_challenge_team_leaderboard TO authenticated, anon, service_role;
GRANT ALL ON public.fitness_challenge_teams TO postgres, service_role;
GRANT SELECT, INSERT ON public.fitness_challenge_teams TO authenticated;
GRANT ALL ON public.fitness_challenge_entries TO postgres, service_role;
GRANT SELECT, INSERT ON public.fitness_challenge_entries TO authenticated;
