import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const AnalyticsQuerySchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d"]).default("7d"),
});

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = AnalyticsQuerySchema.safeParse({
    period: req.nextUrl.searchParams.get("period") || "7d",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  // get_ai_analytics aggregates in SQL over the full matching window — the
  // previous version of this route fetched two raw `.limit(1000)` row sets
  // and aggregated in JS, which silently undercounted once volume in a
  // window exceeded 1000, and duplicated the same aggregation logic that
  // /api/ai/metrics also implemented independently.
  const { data, error } = await admin.rpc("get_ai_analytics", {
    time_filter: parsed.data.period,
  });

  if (error) {
    console.error("[ai/analytics] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load AI analytics." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    period: parsed.data.period,
    usage: {
      requests: data.total_requests,
      uniqueUsers: data.unique_users,
      errors: data.errors,
      tokens: data.total_tokens,
      avgLatency: data.avg_latency,
    },
    moderation: {
      flags: data.moderation.flags,
      aiDetected: data.moderation.ai_detected,
      pending: data.moderation.pending,
      avgConfidence: data.moderation.avg_confidence,
    },
  });
}
