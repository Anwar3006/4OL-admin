/**
 * POST /api/facilityscout/submissions/[id]/register — mark a verified
 * scout submission as Registered (Gap Analysis Part N, N.4 Phase 5:
 * "registered submissions create/link a facility_profile row"). The
 * registrar links the submission to the facility it added; if no facility
 * id is provided yet, the submission simply advances to registered and the
 * linkage can be PATCHed in later. Reward disbursement is a separate step.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const REGISTER_SCHEMA = z.object({
  matched_facility_id: z.string().uuid().optional(),
  review_notes: z.string().max(2000).optional(),
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

  const parsed = REGISTER_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("facility_scout_submissions")
    .select("id, submission_ref, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (["registered", "rewarded"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Submission is already registered" },
      { status: 409 },
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("facility_scout_submissions")
    .update({
      status: "registered",
      ...(parsed.data.matched_facility_id
        ? { matched_facility_id: parsed.data.matched_facility_id }
        : {}),
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.review_notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, submission_ref, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to register submission" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facilityscout_submission_registered",
    p_target_table: "facility_scout_submissions",
    p_record_id: id,
    p_description: `Scout submission ${existing.submission_ref} registered`,
    p_severity: "info",
    p_old_data: { status: existing.status },
    p_new_data: { matched_facility_id: parsed.data.matched_facility_id ?? null },
  });

  return NextResponse.json({ data: updated });
}
