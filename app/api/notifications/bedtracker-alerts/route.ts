import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * BedTracker alerts feed (Gap Analysis Part R, R-D3/R8). Read-view over
 * Part L's bed_tracker_alerts — no duplicate table. Joins through
 * bed_tracker_facilities to facility_profile for the facility name.
 */
export async function GET() {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("bed_tracker_alerts")
    .select(
      "id, alert_type, severity, message, bed_type, beds_available, beds_total, is_resolved, notification_sent, notification_sent_at, created_at, facility:bed_tracker_facilities(facility_profile(name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[notifications/bedtracker-alerts GET] Supabase error:", error.message);
    return NextResponse.json({ alerts: [] });
  }

  return NextResponse.json({ alerts: data ?? [] });
}
