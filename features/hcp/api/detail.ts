/**
 * PATCH /api/hcp/[id] — HCP record editing (Gap Analysis Part J).
 * Covers profession/facility reassignment, region, group-chat assignment,
 * med-enquiry opt-in and suspension. verification_status has no
 * 'suspended' value (prod CHECK), so Suspend maps to 'expired' with the
 * reason preserved in rejection_reason (J-D6); Reactivate restores
 * 'verified'. Full account deactivation stays in Part C users routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const EDIT_SCHEMA = z.object({
  profession_type: z.string().nullish(),
  specialty: z.string().nullish(),
  license_number: z.string().nullish(),
  issuing_body: z.string().nullish(),
  license_expiry: z.string().nullish(),
  affiliated_facility_id: z.string().uuid().nullish(),
  affiliated_facility_name: z.string().nullish(),
  region: z.string().nullish(),
  group_chat_id: z.string().uuid().nullish(),
  can_respond_enquiries: z.boolean().optional(),
  action: z.enum(["suspend", "reactivate"]).optional(),
  reason: z.string().max(2000).optional(),
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

  const parsed = EDIT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const passthrough = [
    "profession_type",
    "specialty",
    "license_number",
    "issuing_body",
    "license_expiry",
    "affiliated_facility_id",
    "affiliated_facility_name",
    "region",
    "group_chat_id",
    "can_respond_enquiries",
  ] as const;
  for (const key of passthrough) {
    const value = parsed.data[key];
    if (value !== undefined) update[key] = value;
  }

  if (parsed.data.action === "suspend") {
    update.verification_status = "expired";
    update.rejection_reason =
      parsed.data.reason ?? "Suspended via admin action";
  }
  if (parsed.data.action === "reactivate") {
    update.verification_status = "verified";
    update.rejection_reason = null;
  }

  const supabase = getAdminClient();
  const { data: updated, error } = await supabase
    .from("hcp_verifications")
    .update(update)
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "HCP record not found" }, { status: 404 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: parsed.data.action
      ? parsed.data.action === "suspend"
        ? "hcp_suspended"
        : "hcp_reactivated"
      : "hcp_record_edited",
    p_target_table: "hcp_verifications",
    p_record_id: id,
    p_description: parsed.data.action
      ? `HCP record ${parsed.data.action}d`
      : "HCP record edited",
    p_severity: parsed.data.action === "suspend" ? "warning" : "info",
    p_old_data: null,
    p_new_data: update,
  });

  return NextResponse.json({ ok: true });
}
