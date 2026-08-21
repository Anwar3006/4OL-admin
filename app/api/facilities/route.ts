/**
 * GET /api/facilities — facilities registry list (Gap Analysis Part H).
 * Filters: search (name/district/region/hefra), status, facility_type,
 * featured, top_rated + pagination. Guarded by facilities.view.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const FACILITY_SELECT = [
  "id",
  "facility_name",
  "facility_type",
  "region",
  "district",
  "area",
  "contact_number",
  "email",
  "status",
  "is_top_rated",
  "is_featured",
  "featured_order",
  "hefra_registration_number",
  "top_rated_rank",
  "top_rated_set_at",
  "feature_type",
  "feature_start",
  "feature_end",
  "is_featured_paused",
  "status_reason",
  "status_changed_at",
  "rejection_reason",
  "submitted_by",
  "approved_by",
  "approved_at",
  "view_count",
  "rating_average",
  "rating_count",
  "subscription_tier",
  "created_at",
  "updated_at",
].join(", ");

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const featured = searchParams.get("featured");
  const topRated = searchParams.get("top_rated");

  const supabase = getSupabaseAdmin();
  const query = supabase
    .from("facility_profile")
    .select(FACILITY_SELECT, { count: "exact" });

  if (search) {
    query.or(
      `facility_name.ilike.%${search}%,district.ilike.%${search}%,region.ilike.%${search}%,hefra_registration_number.ilike.%${search}%`,
    );
  }
  if (status) query.eq("status", status);
  if (type) {
    if (type === "wellness_center") query.ilike("facility_type", "wellness%");
    else query.eq("facility_type", type);
  }
  if (featured === "yes") query.eq("is_featured", true);
  if (featured === "no") query.eq("is_featured", false);
  if (topRated === "yes") query.eq("is_top_rated", true);

  if (topRated === "yes") {
    query
      .order("top_rated_rank", { ascending: true, nullsFirst: false })
      .order("rating_average", { ascending: false });
  } else {
    query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  return NextResponse.json({
    data: data ?? [],
    meta: { total, totalPages: Math.ceil(total / limit), currentPage: page },
  });
}
