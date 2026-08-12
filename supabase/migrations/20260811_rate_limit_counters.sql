-- Migration: Rate limit counters
-- Description: Generic per-user, per-route, fixed-window rate limiting.
-- No Redis/Upstash exists in this project (confirmed via full-repo audit,
-- see TASKS.md Epic 8.14) — this reuses the database that's already there
-- instead of provisioning new infra. Counters live in Postgres and are
-- incremented atomically via check_and_increment_rate_limit(), so it's
-- safe under concurrent requests and shared correctly across serverless
-- instances (the problem with the in-process Map approach it replaces).

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  user_id uuid NOT NULL,
  route_key text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, route_key, window_start)
);

-- Lets a cron job clean out old buckets without a full table scan.
CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_window_start
  ON public.rate_limit_counters (window_start);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No policies: only ever touched via the SECURITY DEFINER RPC below using
-- the service-role key from server-side API routes, never directly by a
-- user session.

-- Atomically bumps the counter for (user_id, route_key) in the current
-- fixed window and reports whether the caller is still under the limit.
-- Fixed-window (not sliding) — simplest correct option for this use case;
-- worst case lets a burst through right at a window boundary, which is an
-- acceptable tradeoff for an abuse/cost guard, not a security boundary.
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_route_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE (allowed boolean, request_count integer, window_start timestamptz, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_counters (user_id, route_key, window_start, request_count)
  VALUES (p_user_id, p_route_key, v_window_start, 1)
  ON CONFLICT (user_id, route_key, window_start)
  DO UPDATE SET request_count = public.rate_limit_counters.request_count + 1
  RETURNING public.rate_limit_counters.request_count INTO v_count;

  RETURN QUERY SELECT
    v_count <= p_max_requests,
    v_count,
    v_window_start,
    GREATEST(0, CEIL(extract(epoch FROM (v_window_start + make_interval(secs => p_window_seconds)) - now()))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) TO service_role;
