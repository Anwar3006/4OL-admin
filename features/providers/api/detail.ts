/**
 * GET /api/providers/[id] — single provider for the detail page's Profile
 * tab. Pulls owner PII from provider_private, which only the owner and
 * admins can read (P0-10) — this route runs on the admin (service-role)
 * client, so that's enforced by requireAdminApiUser, not RLS.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderDetail } from "../schema/types";

const PROVIDER_DETAIL_SELECT = [
  "id",
  "name",
  "kind",
  "provider_type",
  "description",
  "region",
  "district",
  "area",
  "street",
  "post_code",
  "gps_address",
  "country",
  "latitude",
  "longitude",
  "ownership",
  "accepts_nhis",
  "business_hours",
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
  "provider_private (status_reason, rejection_reason, admin_notes, owner_first_name, owner_last_name, owner_email, owner_phone, owner_position)",
  "provider_types (label)",
].join(", ");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const row = data as any;
  const privateData = Array.isArray(row.provider_private) ? row.provider_private[0] : row.provider_private;
  const typeData = Array.isArray(row.provider_types) ? row.provider_types[0] : row.provider_types;

  const detail: ProviderDetail = {
    ...row,
    provider_type_label: typeData?.label ?? null,
    status_reason: privateData?.status_reason ?? null,
    rejection_reason: privateData?.rejection_reason ?? null,
    admin_notes: privateData?.admin_notes ?? null,
    owner_first_name: privateData?.owner_first_name ?? null,
    owner_last_name: privateData?.owner_last_name ?? null,
    owner_email: privateData?.owner_email ?? null,
    owner_phone: privateData?.owner_phone ?? null,
    owner_position: privateData?.owner_position ?? null,
  };

  return NextResponse.json(detail);
}
