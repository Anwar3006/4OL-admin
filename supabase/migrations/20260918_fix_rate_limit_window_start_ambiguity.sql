-- check_and_increment_rate_limit has been silently broken for every caller:
-- RETURNS TABLE(..., window_start ...) makes window_start a PL/pgSQL
-- variable, which collides with rate_limit_counters.window_start inside the
-- ON CONFLICT target list -- 42702 "column reference is ambiguous" on every
-- single call. lib/rate-limit.ts's checkRateLimit() fails OPEN on any RPC
-- error, so nothing crashed; rate limiting has just never actually applied
-- anywhere it's used. Fix: rename the OUT column so it no longer shadows the
-- real table column. Nothing reads the old `window_start` field name from
-- the JS caller, so this is a safe rename.
--
-- Found 2026-09-18 while adding a new rate-limited route
-- (app/api/user/export-data) and seeing the RPC fail on its very first call.
drop function if exists public.check_and_increment_rate_limit(uuid, text, integer, integer);

create or replace function public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_route_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table(allowed boolean, request_count integer, rate_window_start timestamptz, retry_after_seconds integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters (user_id, route_key, window_start, request_count)
  values (p_user_id, p_route_key, v_window_start, 1)
  on conflict (user_id, route_key, window_start)
  do update set request_count = public.rate_limit_counters.request_count + 1
  returning public.rate_limit_counters.request_count into v_count;

  return query select
    v_count <= p_max_requests,
    v_count,
    v_window_start,
    greatest(0, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds)) - now()))::integer);
end;
$$;
