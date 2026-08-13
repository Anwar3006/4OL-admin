import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MetricsQuerySchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
});

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = MetricsQuerySchema.safeParse({
    period: req.nextUrl.searchParams.get("period") || "24h",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  // get_ai_analytics aggregates in SQL over the full matching window — the
  // previous version of this route fetched a raw `.limit(1000)` rows and
  // aggregated in JS, which silently undercounted once call volume in a
  // window exceeded 1000.
  const { data, error } = await admin.rpc("get_ai_analytics", {
    time_filter: parsed.data.period,
  });

  if (error) {
    console.error("[ai/metrics] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load AI metrics." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    period: parsed.data.period,
    totalRequests: data.total_requests,
    totalTokens: data.total_tokens,
    totalCost: data.total_cost,
    avgLatency: data.avg_latency,
    successRate: data.success_rate,
    byModel: data.by_model,
  });
}
