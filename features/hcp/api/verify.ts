/**
 * PATCH /api/hcp/[id]/verify — HCP verification workflow
 * (Gap Analysis Part J, J6/J-D7). Approve stamps verified/verified_by/
 * verified_at; reject stamps rejected + rejection_reason. Regulatory-portal
 * checks (MDC/PCG/NMC/AHPC/GPC) stay manual — the UI surfaces the alert.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const VERIFY_SCHEMA = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
  next_verification_due: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("hcp.verify");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = VERIFY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const approved = parsed.data.decision === "approved";
  const update: Record<string, unknown> = approved
    ? {
        verification_status: "verified",
        verified_by: auth.user.id,
        verified_at: new Date().toISOString(),
        rejection_reason: null,
      }
    : {
        verification_status: "rejected",
        verified_by: auth.user.id,
        verified_at: new Date().toISOString(),
        rejection_reason: parsed.data.reason ?? null,
      };
  if (approved && parsed.data.next_verification_due) {
    update.next_verification_due = parsed.data.next_verification_due;
  }

  const supabase = getAdminClient();
  const { data: updated, error } = await supabase
    .from("hcp_verifications")
    .update(update)
    .eq("id", id)
    .select("id, user_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "HCP record not found" }, { status: 404 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: approved ? "hcp_verification_approved" : "hcp_verification_rejected",
    p_target_table: "hcp_verifications",
    p_record_id: id,
    p_description: `HCP verification ${approved ? "approved" : "rejected"}${parsed.data.reason ? ` — ${parsed.data.reason}` : ""}`,
    p_severity: approved ? "info" : "warning",
    p_old_data: null,
    p_new_data: { decision: parsed.data.decision },
  });

  return NextResponse.json({ ok: true });
}
