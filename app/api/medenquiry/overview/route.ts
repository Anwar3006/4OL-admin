/**
 * /api/medenquiry/overview
 * Gap Analysis Part AB: aggregated Medication Enquiry KPIs + pharmacy
 * response performance behind RBAC (Part AA graceful-degradation contract).
 *
 * GET → medenquiry.view — KPIs (30d enquiries, pending/unmatched, escrow
 * held, delivery count, open disputes, match rate) + pharmacy_performance.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("medenquiry.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("get_med_enquiry_overview");

    if (error || !data) {
      // Pre-migration graceful degradation: report no data yet.
      return NextResponse.json({
        ok: true,
        empty: true,
        overview: null,
        reason: error?.message ?? "overview unavailable",
      });
    }

    const overview = data as Record<string, unknown>;
    if (overview.error) {
      return NextResponse.json({ ok: true, empty: true, overview: null, reason: String(overview.error) });
    }

    return NextResponse.json({ ok: true, empty: false, overview });
  } catch {
    return NextResponse.json({ error: "Failed to load med-enquiry overview" }, { status: 500 });
  }
}
