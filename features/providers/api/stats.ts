/**
 * GET /api/providers/stats — registry KPIs for the Providers list header:
 * counts by status, by kind and by verification status.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import {
  PROVIDER_KINDS,
  PROVIDER_STATUSES,
  VERIFICATION_STATUSES,
  type ProviderStatsResponse,
} from "../schema/types";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const params = request.nextUrl.searchParams;
  const entity = params.get("entity");
  const category = params.get("category");
  const supabase = getAdminClient();
  const query = supabase
    .from("providers")
    .select("status, kind, verification_status, provider_types!inner(listing_entity, directory_category)");
  if (entity === "business" || entity === "person") query.eq("provider_types.listing_entity", entity);
  if (category && category !== "all") {
    if (category === "unlisted") query.is("provider_types.directory_category", null);
    else query.eq("provider_types.directory_category", category);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const byStatus = Object.fromEntries(
    PROVIDER_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]),
  ) as ProviderStatsResponse["byStatus"];

  const byKind = Object.fromEntries(
    PROVIDER_KINDS.map((k) => [k, rows.filter((r) => r.kind === k).length]),
  ) as ProviderStatsResponse["byKind"];

  const byVerification = Object.fromEntries(
    VERIFICATION_STATUSES.map((v) => [v, rows.filter((r) => r.verification_status === v).length]),
  ) as ProviderStatsResponse["byVerification"];

  const payload: ProviderStatsResponse = {
    total: rows.length,
    byStatus,
    byKind,
    byVerification,
  };

  return NextResponse.json(payload);
}
