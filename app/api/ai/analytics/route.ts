import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const AnalyticsQuerySchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d"]).default("7d"),
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

  const parsed = AnalyticsQuerySchema.safeParse({
    period: req.nextUrl.searchParams.get("period") || "7d",
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
  const [callsResult, flagsResult] = await Promise.all([
    admin
      .from("fitness_ai_calls")
      .select("model_name, status, token_usage, response_time_ms, created_at, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("content_moderation_flags")
      .select("id, content_type, status, ai_detected, ai_confidence, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (callsResult.error) {
    console.error("[ai/analytics] AI calls error:", callsResult.error.message);
    return NextResponse.json(
      { error: "Failed to load AI call analytics." },
      { status: 500 },
    );
  }

  if (flagsResult.error) {
    console.error(
      "[ai/analytics] moderation flags error:",
      flagsResult.error.message,
    );
    return NextResponse.json(
      { error: "Failed to load moderation analytics." },
      { status: 500 },
    );
  }

  const calls = callsResult.data ?? [];
  const flags = flagsResult.data ?? [];
  const uniqueUsers = new Set(calls.map((call) => call.user_id).filter(Boolean));
  const aiDetectedFlags = flags.filter((flag) => flag.ai_detected);
  const pendingFlags = flags.filter((flag) => flag.status === "pending_review");

  return NextResponse.json({
    period: parsed.data.period,
    usage: {
      requests: calls.length,
      uniqueUsers: uniqueUsers.size,
      errors: calls.filter((call) => call.status && call.status !== "success")
        .length,
      tokens: calls.reduce((sum, call) => sum + Number(call.token_usage ?? 0), 0),
      avgLatency:
        calls.length > 0
          ? Math.round(
              calls.reduce(
                (sum, call) => sum + Number(call.response_time_ms ?? 0),
                0,
              ) / calls.length,
            )
          : 0,
    },
    moderation: {
      flags: flags.length,
      aiDetected: aiDetectedFlags.length,
      pending: pendingFlags.length,
      avgConfidence:
        aiDetectedFlags.length > 0
          ? Math.round(
              aiDetectedFlags.reduce(
                (sum, flag) => sum + Number(flag.ai_confidence ?? 0),
                0,
              ) / aiDetectedFlags.length,
            )
          : 0,
    },
  });
}
