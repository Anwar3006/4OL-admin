/**
 * GET /api/providers/stats — registry KPIs for the Providers list header:
 * counts by status, by kind and by verification status.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import {
  PROVIDER_KINDS,
  PROVIDER_STATUSES,
  VERIFICATION_STATUSES,
  type ProviderStatsResponse,
} from "../schema/types";

export async function GET() {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getAdminClient();
  const { data, error } = await supabase.from("providers").select("status, kind, verification_status");

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
