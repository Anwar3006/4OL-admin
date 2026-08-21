/**
 * GET /api/diseases/stats — Engagement Analytics data source
 * (Gap Analysis Part I, I2/I5). Computes everything from columns that
 * actually exist: views, like/save counters (0 until the
 * content_engagement pipeline lands), review rate, category breakdown,
 * and the top-viewed / top-liked / top-saved leaderboards.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("diseases.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("conditions")
    .select(
      `
      id, name, view_count, like_count, save_count, status, reviewed_at,
      condition_categories (categories (name))
      `,
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const totalConditions = rows.length;
  const totalViews = rows.reduce((s, r: any) => s + (r.view_count ?? 0), 0);
  const totalLikes = rows.reduce((s, r: any) => s + (r.like_count ?? 0), 0);
  const totalSaves = rows.reduce((s, r: any) => s + (r.save_count ?? 0), 0);
  const reviewedCount = rows.filter((r: any) => r.reviewed_at).length;

  const categoryCounts: Record<string, number> = {};
  rows.forEach((row: any) => {
    row.condition_categories?.forEach((c: any) => {
      const name = c.categories?.name;
      if (name) categoryCounts[name] = (categoryCounts[name] ?? 0) + 1;
    });
  });

  const top = (key: string) =>
    [...rows]
      .sort((a: any, b: any) => (b[key] ?? 0) - (a[key] ?? 0))
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        value: r[key] ?? 0,
      }));

  return NextResponse.json({
    totals: {
      conditions: totalConditions,
      views: totalViews,
      likes: totalLikes,
      saves: totalSaves,
      reviewRate:
        totalConditions === 0
          ? 0
          : Math.round((reviewedCount / totalConditions) * 100),
      // Save/like rates are views-relative; 0 until views accumulate.
      saveRate: totalViews === 0 ? 0 : +((totalSaves / totalViews) * 100).toFixed(1),
      likeRate: totalViews === 0 ? 0 : +((totalLikes / totalViews) * 100).toFixed(1),
    },
    topViewed: top("view_count"),
    topLiked: top("like_count"),
    topSaved: top("save_count"),
    categoryBreakdown: Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    // Likes/Saves arrive with the content_engagement pipeline
    // (MOBILE_NAVIGATION_AND_ADMIN_MAPPING_AUDIT.md Part 4).
    engagementPipelineLive: totalLikes + totalSaves > 0,
  });
}
