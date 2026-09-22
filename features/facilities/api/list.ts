import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { FacilityRow } from "../data/useFacilitiesApi";

/**
 * FacilitiesPage.tsx's type filter still sends the legacy free-text values
 * from types/formInput.ts's FACILITY_TYPE_ENUM (that dropdown isn't rebuilt
 * until P0-14 reads provider_types directly). Those values mostly don't
 * match the current provider_type keys — 'home' isn't 'care_home',
 * 'osteopathy_center' isn't 'osteopathy_centre' — so without this map the
 * filter silently returns zero rows for most options. Mirrors the DB's
 * _resolve_legacy_provider_type() exactly. 'ibp' has no mapping (IBP is
 * retired, folded into the vendor kind with no 1:1 successor) and falls
 * through unmapped, which is fine here: a filter with no matches is a
 * result, not an error.
 */
const LEGACY_FACILITY_TYPE_TO_PROVIDER_TYPE: Record<string, string> = {
  "hospital_/_clinic": "hospital_clinic",
  "herbal_center": "herbal_centre",
  "diagnostic_lab": "diagnostic_lab",
  "pharmacy": "pharmacy",
  "dental_clinic": "dental_clinic",
  "home": "care_home",
  "eye_clinic": "eye_clinic",
  "osteopathy_center": "osteopathy_centre",
  "physiotherapy_center": "physio_centre",
  "prosthetics_center": "prosthetics_centre",
  "psychiatric_center": "psychiatric_centre",
  "health_school": "health_school",
  "wellness_center": "gym",
  "personal_trainer": "personal_trainer",
};

const PROVIDERS_SELECT = [
  "id",
  "name",
  "provider_type",
  "region",
  "district",
  "area",
  "contact_number",
  "email",
  "status",
  "is_top_rated",
  "is_featured",
  "featured_order",
  "top_rated_rank",
  "top_rated_set_at",
  "feature_type",
  "feature_start",
  "feature_end",
  "is_featured_paused",
  "status_changed_at",
  "submitted_by",
  "approved_by",
  "approved_at",
  "view_count",
  "rating_average",
  "rating_count",
  "subscription_tier",
  "created_at",
  "updated_at",
  "provider_private (status_reason, rejection_reason)",
  "provider_credentials (number, credential_type, status)",
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

  const supabase = getAdminClient();
  const query = supabase
    .from("providers")
    .select(PROVIDERS_SELECT, { count: "exact" });

  if (search) {
    // hefra_registration_number moved to provider_credentials (P0-11); a
    // joined-table column can't be searched in the same .or() as PostgREST
    // has no cross-relation ilike, so this is search-by-name/district/region
    // only now. Search-by-licence-number would need its own query branch.
    query.or(
      `name.ilike.%${search}%,district.ilike.%${search}%,region.ilike.%${search}%`,
    );
  }
  if (status) query.eq("status", status);
  if (type) {
    query.eq("provider_type", LEGACY_FACILITY_TYPE_TO_PROVIDER_TYPE[type] ?? type);
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
  
  // Map providers to the expected FacilityRow shape
  const mappedData: FacilityRow[] = (data || []).map((row: any) => {
    const hefraCredentials = (row.provider_credentials || []).filter(
      (c: any) => c.credential_type === "hefra_facility_licence"
    );
    // Prefer the verified one; a rejected/expired/revoked number shouldn't
    // display as if it were current.
    const hefraCredential =
      hefraCredentials.find((c: any) => c.status === "verified") ?? hefraCredentials[0];
    // PostgREST 1:1 relation might return an array or an object
    const privateData = Array.isArray(row.provider_private) 
      ? row.provider_private[0] 
      : row.provider_private;

    return {
      ...row,
      id: row.id,
      facility_name: row.name,
      facility_type: row.provider_type,
      status_reason: privateData?.status_reason || null,
      rejection_reason: privateData?.rejection_reason || null,
      hefra_registration_number: hefraCredential?.number || null,
    };
  });

  return NextResponse.json({
    data: mappedData,
    meta: { total, totalPages: Math.ceil(total / limit), currentPage: page },
  });
}
