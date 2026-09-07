import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPeriodRequestClient } from "@/features/period/data/request-auth";

const AnalyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getPeriodRequestClient(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = AnalyticsQuerySchema.safeParse({
      period: (searchParams.get("period") as any) || "30d",
    });

    if (!query.success) {
      return NextResponse.json({ error: "Invalid query parameters", details: query.error.flatten() }, { status: 400 });
    }

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[query.data.period || "30d"];
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: logs, error: logsError } = await supabase
      .from("period_daily_logs")
      .select("symptoms, moods, logged_on")
      .eq("user_id", user.id)
      .gte("logged_on", sinceDate);

    if (logsError) {
      console.error("[period/analytics] Supabase error:", logsError.message);
      return NextResponse.json({ error: "Failed to fetch period analytics" }, { status: 500 });
    }

    const totalLogs = (logs || []).length;

    const bySymptom = (logs || []).reduce((acc: Record<string, number>, log) => {
      (log.symptoms || []).forEach((item: unknown) => {
        const symptom =
          typeof item === "string"
            ? item
            : item && typeof item === "object" && "name" in item
              ? String((item as { name?: unknown }).name || "")
              : "";
        if (symptom) acc[symptom] = (acc[symptom] || 0) + 1;
      });
      return acc;
    }, {});

    const byMood = (logs || []).reduce((acc: Record<string, number>, log) => {
      (log.moods || []).forEach((mood: string) => {
        acc[mood || "unknown"] = (acc[mood || "unknown"] || 0) + 1;
      });
      return acc;
    }, {});

    return NextResponse.json({
      totalLogs,
      bySymptom,
      byMood,
      period: query.data.period,
    });
  } catch (err) {
    console.error("[period/analytics] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
