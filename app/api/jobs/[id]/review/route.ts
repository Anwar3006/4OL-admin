/**
 * PATCH /api/jobs/[id]/review — posting approval workflow
 * (Gap Analysis Part K, K5/K-D6). Approve: pending_review → published
 * (published_at stamped). Reject: pending_review → draft with
 * posting_rejection_reason recorded.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const REVIEW_SCHEMA = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(2000).optional(),
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

  const parsed = REVIEW_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const approved = parsed.data.decision === "approved";
  const now = new Date().toISOString();
  const update: Record<string, unknown> = approved
    ? {
        status: "published",
        published_at: now,
        approved_by: auth.user.id,
        approved_at: now,
        posting_rejection_reason: null,
      }
    : {
        status: "draft",
        approved_by: auth.user.id,
        approved_at: now,
        posting_rejection_reason: parsed.data.reason ?? null,
      };

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("job_postings")
    .update(update)
    .eq("id", id)
    .eq("status", "pending_review")
    .select("id, title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json(
      { error: "Posting not found or not pending review" },
      { status: 404 },
    );
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: approved ? "job_posting_approved" : "job_posting_rejected",
    p_target_table: "job_postings",
    p_record_id: id,
    p_description: `Job posting "${updated[0]?.title}" ${approved ? "approved and published" : "rejected"}${parsed.data.reason ? ` — ${parsed.data.reason}` : ""}`,
    p_severity: approved ? "info" : "warning",
    p_old_data: null,
    p_new_data: { decision: parsed.data.decision },
  });

  return NextResponse.json({ ok: true });
}
