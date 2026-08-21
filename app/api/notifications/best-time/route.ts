import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Best-time-to-send analytics (Gap Analysis Part R, R-D2). Live RPC over
 * notifications.opened_at — honest zeros until send volume exists; never
 * mock data from analytics_events (Epic 30.1 still unbuilt).
 */
export async function GET() {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_best_time_stats");

  if (error) {
    console.error("[notifications/best-time GET] Supabase error:", error.message);
    return NextResponse.json({ buckets: [], configured: false });
  }

  return NextResponse.json({ buckets: data ?? [], configured: (data ?? []).length > 0 });
}
