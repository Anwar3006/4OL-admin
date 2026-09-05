/**
 * /api/facilityscout/config — FacilityScout Settings tab persistence
 * (Gap Analysis Part N, N6/N-D6: single-row facility_scout_config).
 *
 * GET   → facilityscout.view   — reward tiers + programme rules
 * PATCH → facilityscout.review — Save Tiers / rules form
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  reward_hospital_mb: z.number().int().min(0).max(102400).optional(),
  reward_pharmacy_mb: z.number().int().min(0).max(102400).optional(),
  reward_clinic_mb: z.number().int().min(0).max(102400).optional(),
  reward_lab_mb: z.number().int().min(0).max(102400).optional(),
  reward_chps_mb: z.number().int().min(0).max(102400).optional(),
  max_pending_per_user: z.number().int().min(1).max(100).optional(),
  gps_match_radius_m: z.number().int().min(5).max(1000).optional(),
  photo_required: z.boolean().optional(),
  duplicate_detection: z.enum(["gps_name", "gps_only", "manual"]).optional(),
  collector_auto_assign: z.boolean().optional(),
  reward_disbursement: z.enum(["auto", "manual"]).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("facilityscout.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("facility_scout_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data ?? null });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser("facilityscout.review");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: before, error: beforeError } = await admin
    .from("facility_scout_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (beforeError) {
    return NextResponse.json({ error: beforeError.message }, { status: 500 });
  }

  const { data: updated, error: updateError } = await admin
    .from("facility_scout_config")
    .update({ ...parsed.data, updated_by: auth.user.id, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to save FacilityScout settings" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facilityscout_config_updated",
    p_target_table: "facility_scout_config",
    p_record_id: null,
    p_description: "FacilityScout programme settings updated",
    p_severity: "info",
    p_old_data: before,
    p_new_data: parsed.data,
  });

  return NextResponse.json({ config: updated });
}
