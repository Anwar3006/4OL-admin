import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Recommendation engine stats (Gap Analysis Part O / O-D4).
 * Reads ai_recommendation_stats — written by the recommender pipeline or
 * manual import. Returns `configured: false` with empty aggregates until
 * rows exist (no fake metrics).
 */
export async function GET() {
  const auth = await requireAdminApiUser("ai.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("ai_recommendation_stats")
    .select("*")
    .order("stat_date", { ascending: false })
    .limit(500);

  if (error) {
    // Table missing (migration not applied) or other failure — honest
    // not-configured shape so the tab renders its empty state.
    console.error("[ai/recommendations] Supabase error:", error.message);
    return NextResponse.json({
      configured: false,
      stats: emptyStats(),
      categories: [],
      segments: [],
    });
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      configured: false,
      stats: emptyStats(),
      categories: [],
      segments: [],
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const totals = rows.reduce(
    (acc, row) => {
      acc.itemsServed += row.items_served ?? 0;
      acc.clicks += row.clicks ?? 0;
      acc.conversions += row.conversions ?? 0;
      if (row.satisfaction != null) {
        acc.satisfactionSum += Number(row.satisfaction);
        acc.satisfactionCount += 1;
      }
      if (row.stat_date === today) acc.generatedToday += row.items_served ?? 0;
      return acc;
    },
    {
      itemsServed: 0,
      clicks: 0,
      conversions: 0,
      satisfactionSum: 0,
      satisfactionCount: 0,
      generatedToday: 0,
    },
  );

  // Category aggregates → progress bars (share of items served per type).
  const byType = new Map<string, number>();
  for (const row of rows) {
    byType.set(
      row.recommendation_type,
      (byType.get(row.recommendation_type) ?? 0) + (row.items_served ?? 0),
    );
  }
  const maxServed = Math.max(1, ...byType.values());
  const categories = [...byType.entries()]
    .map(([type, served]) => ({
      type,
      served,
      share: Math.round((served / totals.itemsServed || 0) * 100),
    }))
    .sort((a, b) => b.served - a.served)
    .slice(0, 6)
    .map((category) => ({ ...category, barPct: Math.round((category.served / maxServed) * 100) }));

  // Segment table — one row per (segment, type), most recent stat_date first.
  const segments = rows.slice(0, 50).map((row) => ({
    statDate: row.stat_date,
    userSegment: row.user_segment,
    recommendationType: row.recommendation_type,
    itemsServed: row.items_served ?? 0,
    ctr:
      row.items_served > 0
        ? Math.round(((row.clicks ?? 0) / row.items_served) * 1000) / 10
        : 0,
    conversions: row.conversions ?? 0,
    satisfaction: row.satisfaction != null ? Number(row.satisfaction) : null,
    modelVersion: row.model_version ?? "—",
  }));

  return NextResponse.json({
    configured: true,
    stats: {
      generatedToday: totals.generatedToday,
      ctr:
        totals.itemsServed > 0
          ? Math.round((totals.clicks / totals.itemsServed) * 1000) / 10
          : 0,
      itemsServed: totals.itemsServed,
      conversions: totals.conversions,
      satisfaction:
        totals.satisfactionCount > 0
          ? Math.round((totals.satisfactionSum / totals.satisfactionCount) * 10) / 10
          : null,
    },
    categories,
    segments,
  });
}

function emptyStats() {
  return {
    generatedToday: 0,
    ctr: 0,
    itemsServed: 0,
    conversions: 0,
    satisfaction: null,
  };
}
