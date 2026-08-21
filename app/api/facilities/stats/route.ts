/**
 * GET /api/facilities/stats — registry KPIs (Gap Analysis Part H).
 * Total / active / pending / inactive / suspended / rejected counts,
 * top-rated + featured occupancy, average rating across rated facilities.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("facility_profile")
    .select(
      "status, is_top_rated, is_featured, is_featured_paused, rating_average, rating_count",
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const byStatus = (status: string) =>
    rows.filter((row) => row.status === status).length;
  const rated = rows.filter(
    (row) => (row.rating_count ?? 0) > 0 && row.rating_average != null,
  );

  return NextResponse.json({
    total: rows.length,
    active: byStatus("active"),
    pending: byStatus("pending"),
    inactive: byStatus("inactive"),
    suspended: byStatus("suspended"),
    rejected: byStatus("rejected"),
    topRated: rows.filter((row) => row.is_top_rated).length,
    featured: rows.filter((row) => row.is_featured).length,
    featuredPaused: rows.filter((row) => row.is_featured_paused).length,
    averageRating: rated.length
      ? Number(
          (
            rated.reduce((sum, row) => sum + Number(row.rating_average ?? 0), 0) /
            rated.length
          ).toFixed(1),
        )
      : null,
    ratedFacilities: rated.length,
  });
}
