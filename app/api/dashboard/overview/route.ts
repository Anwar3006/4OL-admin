import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

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
  const { data, error } = await admin.rpc("get_platform_overview_metrics", {
    time_filter: parsed.data.timeFilter,
  });

  if (error) {
    console.error("[dashboard/overview] Supabase RPC error:", error.message);
    return NextResponse.json(
      { error: "Failed to load platform overview metrics." },
      { status: 500 },
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
          .eq("is_admin", true)
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

  // Active-subscription mix by scope (Subscriber Mix donut). Bounded to
  // active rows only, same shape already proven in
  // app/api/subscriptions/admin/route.ts's `stats.by_scope`.
  let byScope = { all_access: 0, fitness_only: 0, period_only: 0 };
  try {
    const { data: scopeRows, error: scopeError } = await admin
      .from("user_subscriptions")
      .select("scope")
      .eq("status", "active");
    if (scopeError) throw scopeError;
    for (const row of scopeRows ?? []) {
      const scope: string = row.scope;
      if (scope === "all_access" || scope === "fitness_only" || scope === "period_only") {
        byScope[scope] += 1;
      }
    }
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
