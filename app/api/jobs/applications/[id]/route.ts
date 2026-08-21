/**
 * PATCH /api/jobs/applications/[id] — applicant status transitions
 * (Gap Analysis Part K, K6). Valid targets mirror the prod CHECK:
 * pending → reviewed → shortlisted → hired | rejected. Stamps
 * reviewed_by / reviewed_at on first review and stores review_notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UPDATE_SCHEMA = z.object({
  status: z.enum(["pending", "reviewed", "shortlisted", "rejected", "hired"]),
  review_notes: z.string().max(4000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("jobs.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UPDATE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    status: parsed.data.status,
  };
  if (parsed.data.review_notes !== undefined) {
    update.review_notes = parsed.data.review_notes;
  }
  // Stamp reviewer on the first move away from pending.
  if (parsed.data.status !== "pending") {
    update.reviewed_by = auth.user.id;
    update.reviewed_at = new Date().toISOString();
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from("job_applications")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("job_applications")
    .update(update)
    .eq("id", id)
    .select("id, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `job_application_${parsed.data.status}`,
    p_target_table: "job_applications",
    p_record_id: id,
    p_description: `Job application moved ${existing.status} → ${parsed.data.status}`,
    p_severity: "info",
    p_old_data: { status: existing.status },
    p_new_data: update,
  });

  return NextResponse.json({ ok: true, status: updated[0]?.status });
}
