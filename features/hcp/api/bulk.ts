/**
 * POST /api/hcp/bulk — bulk HCP actions (Gap Analysis Part J, J7).
 * Supported: approve (bulk approve selected) and suspend.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const BULK_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approve", "suspend"]),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("hcp.verify");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BULK_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const update =
    parsed.data.action === "approve"
      ? {
          verification_status: "verified",
          verified_by: auth.user.id,
          verified_at: now,
          rejection_reason: null,
        }
      : {
          verification_status: "expired",
          rejection_reason: "Suspended via admin bulk action",
        };

  const supabase = getAdminClient();
  const { data: updated, error } = await supabase
    .from("hcp_verifications")
    .update(update)
    .in("id", parsed.data.ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `hcp_bulk_${parsed.data.action}`,
    p_target_table: "hcp_verifications",
    p_record_id: parsed.data.ids[0] ?? null,
    p_description: `${updated?.length ?? 0} HCP record(s) ${parsed.data.action === "approve" ? "approved" : "suspended"} via bulk action`,
    p_severity: parsed.data.action === "approve" ? "info" : "warning",
    p_old_data: null,
    p_new_data: { ids: parsed.data.ids, action: parsed.data.action },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
