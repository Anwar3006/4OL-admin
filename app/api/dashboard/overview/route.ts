import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { ADMIN_ROLES } from "@/lib/admin-roles";

const QuerySchema = z.object({
  timeFilter: z.enum(["7", "30", "90", "year"]).default("30"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("dashboard.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = QuerySchema.safeParse({
    timeFilter: req.nextUrl.searchParams.get("timeFilter") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  // Retry once on a statement timeout (57014).
  //
  // This endpoint 500'd on the FIRST load after a fresh login and worked on
  // refresh. get_platform_overview_metrics() does ~35 full-table scans; it
  // warm-runs in ~0.6s (1.1s of that was removed by
  // idx_activity_logs_created_at, migration 20260923260000) but on a cold
  // buffer cache it can still take seconds, and PostgREST connects as
  // `authenticator`, whose statement_timeout is 8s — SET ROLE service_role
  // does NOT lift it. Crossing that produced 57014, which arrived here as a
  // plain error and rendered the whole dashboard as a failure.
  //
  // One retry is the right amount: the first attempt is what warms the cache,
  // so the second is the fast one. A timeout that survives both is a real
  // problem and is reported as 503 (try again), not 500 (broken), because
  // nothing is wrong with the request.
  let data: unknown = null;
  let error: { code?: string; message: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await admin.rpc("get_platform_overview_metrics", {
      time_filter: parsed.data.timeFilter,
    });
    data = result.data;
    error = result.error;
    if (!error) break;
    if (error.code !== "57014") break;
    console.warn(
      `[dashboard/overview] RPC timed out (attempt ${attempt + 1}/2): ${error.message}`,
    );
  }

  if (error) {
    console.error("[dashboard/overview] Supabase RPC error:", error.message);
    const timedOut = error.code === "57014";
    return NextResponse.json(
      {
        error: timedOut
          ? "The dashboard is taking longer than usual to load. Please try again."
          : "Failed to load platform overview metrics.",
      },
      { status: timedOut ? 503 : 500 },
    );
  }

  // Extended queue metrics (Gap Analysis Part D): the RPC predates these
  // four queues, so they are computed here and merged in. Each is
  // independent — a missing column/table degrades to 0, never a 500.
  const countQueries: [string, () => Promise<number>][] = [
    [
      "admins_missing_mfa",
      async () => {
        const { count } = await admin
          .from("user_profiles")
          .select("user_id", { count: "exact", head: true })
          // user_profiles.is_admin is legacy and being dropped (PLAN.md P0-05);
          // staff are identified by role.
          .in("role", [...ADMIN_ROLES])
          .neq("mfa_enabled", true);
        return count ?? 0;
      },
    ],
    [
      "pending_job_posts",
      async () => {
        const { count } = await admin
          .from("job_postings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        return count ?? 0;
      },
    ],
    [
      "pending_ai_flags",
      async () => {
        const { count } = await admin
          .from("content_moderation_flags")
          .select("id", { count: "exact", head: true })
          .eq("ai_detected", true)
          .eq("status", "pending_review");
        return count ?? 0;
      },
    ],
    [
      "flagged_reviews",
      async () => {
        const { count } = await admin
          .from("content_moderation_flags")
          .select("id", { count: "exact", head: true })
          .eq("content_type", "review")
          .in("status", ["pending", "under_review", "pending_review"]);
        return count ?? 0;
      },
    ],
  ];

  const queues: Record<string, number> = {};
  for (const [key, fn] of countQueries) {
    try {
      queues[key] = await fn();
    } catch {
      queues[key] = 0;
    }
  }

  const metrics = { ...(data as Record<string, any>) };
  metrics.queues = { ...(metrics.queues ?? {}), ...queues };

  // Daily signups series for the Platform Activity chart (dashboard
  // redesign). Bounded by the RPC's own window (`metrics.window.start_at`)
  // and capped defensively — this table has 37 rows today, but the cap
  // keeps a future "Year" filter from pulling an unbounded payload over
  // the Ghana round trip. Degrades to an empty series, never a 500.
  let signupsTrend: { date: string; count: number }[] = [];
  try {
    const startAt = metrics.window?.start_at as string | undefined;
    if (startAt) {
      const { data: signupRows, error: signupsError } = await admin
        .from("user_profiles")
        .select("created_at")
        .gte("created_at", startAt)
        .limit(10000);
      if (signupsError) throw signupsError;
      const byDay = new Map<string, number>();
      for (const row of signupRows ?? []) {
        const day = String(row.created_at).slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
      signupsTrend = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
    }
  } catch (err) {
    console.error("[dashboard/overview] signups trend error:", err);
  }
  metrics.activity_trend = { signups: signupsTrend };

  // Active-subscription mix by scope (Subscriber Mix donut), deduped by
  // user. `user_subscriptions` isn't the only place entitlement lives —
  // Period Tracker premium can also come from `period_premium_grants`
  // (scope `period_only`), a separate table, same precedent
  // app/api/subscriptions/admin/route.ts's `allRows` already merges. A
  // by_scope count that only reads user_subscriptions silently drops every
  // Plasence-only grantee. One user can also hold rows in both tables at
  // once (verified live: a user with an active `all_access` subscription
  // also had a `period_premium_grants` row) — counting per row instead of
  // per user would double-count them, so this collapses to one bucket per
  // user, all_access taking priority since it already covers everything
  // fitness_only/period_only would otherwise claim.
  let byScope = { all_access: 0, fitness_only: 0, period_only: 0 };
  try {
    const [subsResult, grantsResult] = await Promise.all([
      admin.from("user_subscriptions").select("user_id, scope").eq("status", "active"),
      admin
        .from("period_premium_grants")
        .select("user_id")
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);
    if (subsResult.error) throw subsResult.error;
    if (grantsResult.error) throw grantsResult.error;

    const scopeRank = { all_access: 2, fitness_only: 1, period_only: 0 } as const;
    const byUser = new Map<string, keyof typeof scopeRank>();
    const upgrade = (userId: string, scope: keyof typeof scopeRank) => {
      const current = byUser.get(userId);
      if (!current || scopeRank[scope] > scopeRank[current]) byUser.set(userId, scope);
    };

    for (const row of subsResult.data ?? []) {
      const scope: string = row.scope;
      if (scope === "all_access" || scope === "fitness_only" || scope === "period_only") {
        upgrade(row.user_id, scope);
      }
    }
    for (const row of grantsResult.data ?? []) {
      upgrade(row.user_id, "period_only");
    }

    for (const scope of byUser.values()) byScope[scope] += 1;
  } catch (err) {
    console.error("[dashboard/overview] subscriptions by_scope error:", err);
  }
  if (metrics.subscriptions) metrics.subscriptions.by_scope = byScope;

  // Security Score (decision D-D2): checklist-based until the Security
  // Center instrumentation exists. 100 minus weighted open risks.
  const openThreats = metrics.queues?.open_security_threats ?? 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        queues.admins_missing_mfa * 5 -
        openThreats * 10 -
        queues.pending_ai_flags * 2,
    ),
  );
  if (metrics.kpis) metrics.kpis.security_score = score;

  return NextResponse.json({ metrics });
}
