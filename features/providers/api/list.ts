/**
 * GET /api/providers — the Providers module list (P0-14), filtered by kind,
 * type, status, verification, tier and region.
 *
 * This is the canonical registry. Legacy /facilities URLs redirect here so
 * business listings retain a single operational data source.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderRow, ProvidersListResponse } from "../schema/types";

const PROVIDERS_SELECT = [
  "id",
  "name",
  "kind",
  "provider_type",
  "description",
  "region",
  "district",
  "area",
  "contact_number",
  "whatsapp_number",
  "email",
  "status",
  "verification_status",
  "subscription_tier",
  "is_online_only",
  "is_top_rated",
  "is_featured",
  "view_count",
  "rating_average",
  "rating_count",
  "owner_id",
  "created_at",
  "updated_at",
  "provider_private (status_reason, rejection_reason)",
  "provider_types!inner (label, listing_entity, directory_category)",
].join(", ");

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const search = searchParams.get("search")?.trim();
  const kind = searchParams.get("kind");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const verification = searchParams.get("verification");
  const tier = searchParams.get("tier");
  const region = searchParams.get("region");
  const entity = searchParams.get("entity");
  const category = searchParams.get("category");

  const supabase = getAdminClient();
  const query = supabase.from("providers").select(PROVIDERS_SELECT, { count: "exact" });

  if (search) {
    query.or(`name.ilike.%${search}%,district.ilike.%${search}%,region.ilike.%${search}%`);
  }
  if (kind && kind !== "all") query.eq("kind", kind);
  if (type && type !== "all") query.eq("provider_type", type);
  if (status && status !== "all") query.eq("status", status);
  if (verification && verification !== "all") query.eq("verification_status", verification);
  if (region && region !== "all") query.eq("region", region);
  if (entity === "business" || entity === "person") query.eq("provider_types.listing_entity", entity);
  if (category && category !== "all") {
    if (category === "unlisted") query.is("provider_types.directory_category", null);
    else query.eq("provider_types.directory_category", category);
  }
  if (tier && tier !== "all") {
    if (tier === "none") query.is("subscription_tier", null);
    else query.eq("subscription_tier", tier);
  }

  query.order("created_at", { ascending: false });

  const from = (page - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;

  const mapped: ProviderRow[] = (data ?? []).map((row: any) => {
    const privateData = Array.isArray(row.provider_private)
      ? row.provider_private[0]
      : row.provider_private;
    const typeData = Array.isArray(row.provider_types) ? row.provider_types[0] : row.provider_types;

    return {
      ...row,
      provider_type_label: typeData?.label ?? null,
      listing_entity: typeData?.listing_entity ?? "business",
      directory_category: typeData?.directory_category ?? null,
      status_reason: privateData?.status_reason ?? null,
      rejection_reason: privateData?.rejection_reason ?? null,
    };
  });

  const response: ProvidersListResponse = {
    data: mapped,
    meta: { total, totalPages: Math.ceil(total / limit), currentPage: page },
  };

  return NextResponse.json(response);
}
