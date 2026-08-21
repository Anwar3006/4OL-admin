/**
 * POST /api/marketing/campaigns/[id]/review — business-submitted campaign
 * review (`m-review-biz-campaign`). Gap Analysis Part M (M4).
 *
 * Approve → status live (Approve & Launch), stamps approved window.
 * Reject  → status rejected with notes.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const REVIEW_SCHEMA = z.object({
  decision: z.enum(["approve", "reject"]),
  review_notes: z.string().max(2000).optional(),
  approved_start_date: z.string().min(1).optional(),
  approved_end_date: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.edit");
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

  const admin = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await admin
    .from("marketing_profile")
    .select("id, headline, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (existing.status !== "pending_review") {
    return NextResponse.json(
      { error: "Only campaigns in Pending Review can be reviewed" },
      { status: 409 },
    );
  }

  const approved = parsed.data.decision === "approve";
  const { data: updated, error: updateError } = await admin
    .from("marketing_profile")
    .update({
      status: approved ? "live" : "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.review_notes ?? null,
      ...(approved && parsed.data.approved_start_date
        ? { approved_start_date: parsed.data.approved_start_date }
        : {}),
      ...(approved && parsed.data.approved_end_date
        ? { approved_end_date: parsed.data.approved_end_date }
        : {}),
    })
    .eq("id", id)
    .select("id, headline, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to record review decision" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: approved
      ? "marketing_campaign_approved"
      : "marketing_campaign_rejected",
    p_target_table: "marketing_profile",
    p_record_id: id,
    p_description: `Business campaign "${existing.headline}" ${approved ? "approved & launched" : "rejected"}`,
    p_severity: approved ? "info" : "warning",
    p_old_data: { status: existing.status },
    p_new_data: { status: updated.status, notes: parsed.data.review_notes ?? null },
  });

  return NextResponse.json({ data: updated });
}
