/**
 * POST /api/marketing/campaigns/batch — bulk Launch / End / Pause.
 * Gap Analysis Part M (M3 bulk bar). One audit row per affected campaign
 * would be noisy, so the batch itself is audited with the id list.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BATCH_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["launch", "pause", "end"]),
});

const ACTION_STATUS = { launch: "live", pause: "paused", end: "ended" } as const;

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("marketing.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const status = ACTION_STATUS[parsed.data.action];
  const { data: updated, error } = await admin
    .from("marketing_profile")
    .update({ status })
    .in("id", parsed.data.ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `marketing_campaigns_batch_${parsed.data.action}`,
    p_target_table: "marketing_profile",
    p_record_id: null,
    p_description: `Bulk ${parsed.data.action}: ${updated?.length ?? 0} campaign(s) → ${status}`,
    p_severity: "warning",
    p_old_data: null,
    p_new_data: { ids: parsed.data.ids, status },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
