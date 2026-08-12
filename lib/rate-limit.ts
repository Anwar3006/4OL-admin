import type { SupabaseClient } from "@supabase/supabase-js";

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  requestCount: number;
  retryAfterSeconds: number;
}

/**
 * Supabase-backed fixed-window rate limiter. Call with the same
 * `admin` (service-role) client each route already uses. See
 * check_and_increment_rate_limit() in
 * supabase/migrations/20260811_rate_limit_counters.sql — the counter
 * lives in Postgres, not in-process, so it's correct across cold
 * starts and multiple serverless instances.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  routeKey: string,
  { windowSeconds, maxRequests }: RateLimitOptions,
): Promise<RateLimitResult> {
  const { data, error } = await admin
    .rpc("check_and_increment_rate_limit", {
      p_user_id: userId,
      p_route_key: routeKey,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    })
    .single<{
      allowed: boolean;
      request_count: number;
      retry_after_seconds: number;
    }>();

  if (error) {
    console.error(`[rate-limit] ${routeKey} check failed:`, error.message);
    // Fail open: a rate-limit outage shouldn't take the underlying
    // feature down with it.
    return { allowed: true, requestCount: 0, retryAfterSeconds: 0 };
  }

  return {
    allowed: data.allowed,
    requestCount: data.request_count,
    retryAfterSeconds: data.retry_after_seconds,
  };
}
