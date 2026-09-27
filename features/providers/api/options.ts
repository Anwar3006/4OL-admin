/**
 * GET /api/providers/options — filter-bar data for the Providers list:
 * kinds (static, mirrors the provider_kind enum), provider_types (live,
 * admin-editable — P0-14's Settings lookup editors write to this table),
 * regions (static, mirrors region_enum), statuses and verification statuses.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";
import {
  PROVIDER_KINDS,
  PROVIDER_KIND_LABELS,
  PROVIDER_STATUSES,
  VERIFICATION_STATUSES,
  type ProviderOptionsResponse,
} from "../schema/types";

export async function GET() {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_types")
    .select("key, kind, label, directory_category, listing_entity, is_listed, is_active, sort_order")
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload: ProviderOptionsResponse = {
    kinds: PROVIDER_KINDS.map((value) => ({ value, label: PROVIDER_KIND_LABELS[value] })),
    types: data ?? [],
    regions: GHANA_REGIONS_ENUM,
    statuses: PROVIDER_STATUSES,
    verificationStatuses: VERIFICATION_STATUSES,
  };

  return NextResponse.json(payload);
}
