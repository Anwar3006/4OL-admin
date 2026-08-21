/**
 * POST /api/facilityscout/submissions/[id]/reject — reject a scout
 * submission (Gap Analysis Part N, N.4 Phase 2). Optional duplicate flag
 * records the matched existing facility when known (N-D3: admin-set match
 * result). Pass { ids: [...] } in the body for the bulk-reject variant.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const REJECT_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50).optional(),
  review_notes: z.string().max(2000).optional(),
  duplicate: z.boolean().default(false),
  matched_facility_id: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilityscout.review");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = REJECT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }
  const ids = parsed.data.ids ?? [id];

  const admin = getSupabaseAdmin();
  const { data: updated, error: updateError } = await admin
    .from("facility_scout_submissions")
    .update({
      status: "rejected",
      // Only touch the match result when the admin flags a duplicate.
      ...(parsed.data.duplicate
        ? {
            match_status: "duplicate",
            ...(parsed.data.matched_facility_id
              ? { matched_facility_id: parsed.data.matched_facility_id }
              : {}),
          }
        : {}),
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.review_notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select("id, submission_ref, status");

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? "Failed to reject submission" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facilityscout_submission_rejected",
    p_target_table: "facility_scout_submissions",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} scout submission(s) rejected${
      parsed.data.duplicate ? " as duplicate" : ""
    }`,
    p_severity: "warning",
    p_old_data: null,
    p_new_data: { ids, duplicate: parsed.data.duplicate },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
