import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Footprint log (Gap Analysis Part F, phase 4 — FP-XXXXXX table). Staff
// location history is PII: users.view required (decision F-D6).
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(req.url);
  const collectorId = searchParams.get("collector");
  const region = searchParams.get("region");
  const activity = searchParams.get("activity");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10) || 25));

  const admin = getSupabaseAdmin();
  let query = admin
    .from("collector_footprints")
    .select(
      `
      id, collector_id, facility_id, region, district, area,
      latitude, longitude, gps_accuracy, activity, notes, created_at,
      collector:user_profiles(first_name, last_name),
      facility:facility_profile(facility_name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (collectorId) query = query.eq("collector_id", collectorId);
  if (region) query = query.ilike("region", `%${region}%`);
  if (activity) query = query.eq("activity", activity);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const rangeFrom = (page - 1) * limit;
  const { data, count, error } = await query.range(rangeFrom, rangeFrom + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    footprints: data ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
