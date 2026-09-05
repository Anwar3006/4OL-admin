import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/server";

const AnalyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerClient();
    const { data: { user } } = await supabase.auth.getUser();
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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: cycles, error: cyclesError } = await supabase
      .from("period_cycles")
      .select("symptoms, mood, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since);

    if (cyclesError) {
      console.error("[period/analytics] Supabase error:", cyclesError.message);
      return NextResponse.json({ error: "Failed to fetch period analytics" }, { status: 500 });
    }

    const totalLogs = (cycles || []).length;

    const bySymptom = (cycles || []).reduce((acc: Record<string, number>, c) => {
      (c.symptoms || []).forEach((s: string) => {
        acc[s] = (acc[s] || 0) + 1;
      });
      return acc;
    }, {});

    const byMood = (cycles || []).reduce((acc: Record<string, number>, c) => {
      const mood = c.mood || "unknown";
      acc[mood] = (acc[mood] || 0) + 1;
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
