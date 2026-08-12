import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MetricsQuerySchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
});

const periodHours = {
  "1h": 1,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

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

  const since = new Date(
    Date.now() - periodHours[parsed.data.period] * 60 * 60 * 1000,
  ).toISOString();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitness_ai_calls")
    .select("model_name, response_time_ms, token_usage, estimated_cost, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[ai/metrics] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load AI metrics." },
      { status: 500 },
    );
  }

  const calls = data ?? [];
  const totalRequests = calls.length;
  const totalTokens = calls.reduce(
    (sum, call) => sum + Number(call.token_usage ?? 0),
    0,
  );
  const totalCost = calls.reduce(
    (sum, call) => sum + Number(call.estimated_cost ?? 0),
    0,
  );
  const successful = calls.filter((call) => call.status === "success").length;
  const avgLatency =
    totalRequests > 0
      ? Math.round(
          calls.reduce(
            (sum, call) => sum + Number(call.response_time_ms ?? 0),
            0,
          ) / totalRequests,
        )
      : 0;

  const byModel = calls.reduce<
    Record<string, { requests: number; tokens: number; latencyTotal: number }>
  >((acc, call) => {
    const model = call.model_name || "unknown";
    acc[model] ??= { requests: 0, tokens: 0, latencyTotal: 0 };
    acc[model].requests += 1;
    acc[model].tokens += Number(call.token_usage ?? 0);
    acc[model].latencyTotal += Number(call.response_time_ms ?? 0);
    return acc;
  }, {});

  return NextResponse.json({
    period: parsed.data.period,
    totalRequests,
    totalTokens,
    totalCost,
    avgLatency,
    successRate:
      totalRequests > 0 ? Math.round((successful / totalRequests) * 100) : 0,
    byModel: Object.fromEntries(
      Object.entries(byModel).map(([model, value]) => [
        model,
        {
          requests: value.requests,
          tokens: value.tokens,
          avgLatency:
            value.requests > 0
              ? Math.round(value.latencyTotal / value.requests)
              : 0,
        },
      ]),
    ),
  });
}
