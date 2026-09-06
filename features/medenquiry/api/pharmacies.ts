/**
 * /api/medenquiry/pharmacies
 * Gap Analysis Part AB: pharmacy response/performance leaderboard behind RBAC.
 * Sourced from the `get_med_enquiry_overview()` RPC's pharmacy_performance
 * array (same graceful-degradation contract as /overview).
 *
 * GET → medenquiry.view
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("medenquiry.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("get_med_enquiry_overview");

    if (error || !data) {
      // Pre-migration graceful degradation: no performance data yet.
      return NextResponse.json({ ok: true, empty: true, rows: [], reason: error?.message ?? "overview unavailable" });
    }

    const overview = data as Record<string, unknown>;
    if (overview.error) {
      return NextResponse.json({ ok: true, empty: true, rows: [], reason: String(overview.error) });
    }

    const rows = Array.isArray(overview.pharmacy_performance) ? overview.pharmacy_performance : [];
    return NextResponse.json({ ok: true, empty: false, rows });
  } catch {
    return NextResponse.json({ error: "Failed to load pharmacy performance" }, { status: 500 });
  }
}
