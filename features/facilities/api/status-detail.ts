/**
 * PATCH /api/facilities/[id]/status — facility lifecycle workflow
 * (Gap Analysis Part H, H3/H7). Moves a facility between
 * pending / active / inactive / suspended / rejected, records
 * status_reason + status_changed_at and stamps approved_by on approval.
 * Bulk variant: send { ids: [...], status } — path id is ignored
 * (powers "Approve All Verified" and bulk Suspend).
 *
 * Note: the full approve flow with temp→approved storage moves still runs
 * through the adminChangeFacilityStatus RPC in useFacilities; this route
 * covers lifecycle moves where no media migration is required.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const STATUS_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  status: z.enum(["pending", "active", "inactive", "suspended", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.approve");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = STATUS_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const supabase = getAdminClient();

  const update: Record<string, unknown> = {
    status: parsed.data.status,
    status_reason: parsed.data.reason ?? null,
    status_changed_at: new Date().toISOString(),
  };
  if (parsed.data.status === "active") {
    update.approved_by = auth.user.id;
    update.approved_at = new Date().toISOString();
    update.rejection_reason = null;
  }
  if (parsed.data.status === "rejected" && parsed.data.reason) {
    update.rejection_reason = parsed.data.reason;
  }

  const { data: updated, error } = await supabase
    .from("facility_profile")
    .update(update)
    .in("id", ids)
    .select("id, facility_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facility_status_changed",
    p_target_table: "facility_profile",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} facility(ies) moved to ${parsed.data.status}`,
    p_severity: parsed.data.status === "active" ? "info" : "warning",
    p_old_data: null,
    p_new_data: { ids, status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
