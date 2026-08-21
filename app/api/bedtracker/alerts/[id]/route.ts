/**
 * PATCH /api/bedtracker/alerts/[id] — resolve a bed-capacity alert.
 * Gap Analysis Part L (L7). Resolution is audit-logged; the alert row
 * keeps its history for the Analytics tab's Full-Ward Events metric.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("bedtracker.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: updated, error: updateError } = await admin
    .from("bed_tracker_alerts")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
    })
    .eq("id", id)
    .eq("is_resolved", false)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: "Alert not found or already resolved" },
      { status: 409 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bedtracker_alert_resolved",
    p_target_table: "bed_tracker_alerts",
    p_record_id: id,
    p_description: "Bed capacity alert resolved",
    p_severity: "info",
    p_old_data: null,
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
