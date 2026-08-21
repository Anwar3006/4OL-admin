import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

  const admin = getSupabaseAdmin();
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
