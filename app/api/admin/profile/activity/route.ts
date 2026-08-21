/**
 * GET /api/admin/profile/activity — caller's own recent activity rows.
 * Gap Analysis Part W (mockup's "Recent Activity" table:
 * Action | Page/Module | IP | Time). No permission key — own data only.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activity_logs")
    .select("action_type,target_table,record_id,new_data,ip_address,created_at")
    .eq("actor_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    // ip_address only exists once Epic 11's ALTER has been applied.
    if (error.message?.includes("ip_address")) {
      const retry = await admin
        .from("activity_logs")
        .select("action_type,target_table,record_id,new_data,created_at")
        .eq("actor_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      return NextResponse.json({ activity: retry.data ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity: data ?? [] });
}
