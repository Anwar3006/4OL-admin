/**
 * POST /api/facilityscout/rewards/[id]/disburse — mark a data-bundle
 * reward as sent (Gap Analysis Part N, N-D5: real MNO API integration is
 * deferred; this records delivery_status + audit). Bulk via { ids: [...] }.
 * Linked scout submissions advance to rewarded.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const DISBURSE_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilityscout.review");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine for the single-disburse variant.
  }

  const parsed = DISBURSE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const admin = getAdminClient();

  const { data: queue, error: queueError } = await admin
    .from("facility_scout_referrals")
    .select("id, submission_id, delivery_status, delivery_phone, reward_mb")
    .in("id", ids);

  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 });
  }
  if (!queue?.length) {
    return NextResponse.json({ error: "No matching reward rows" }, { status: 404 });
  }

  const missingPhone = queue.filter((row) => !row.delivery_phone);
  if (missingPhone.length) {
    return NextResponse.json(
      {
        error: `${missingPhone.length} reward row(s) have no delivery phone — set the recipient number first`,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: disbursed, error: disburseError } = await admin
    .from("facility_scout_referrals")
    .update({
      delivery_status: "sent",
      reward_paid: true,
      reward_paid_at: now,
    })
    .in(
      "id",
      queue.filter((row) => row.delivery_status !== "sent").map((row) => row.id),
    )
    .select("id, submission_id");

  if (disburseError) {
    return NextResponse.json({ error: disburseError.message }, { status: 500 });
  }

  // Advance linked scout submissions to rewarded.
  const submissionIds = (disbursed ?? [])
    .map((row) => row.submission_id)
    .filter((value): value is string => Boolean(value));
  if (submissionIds.length) {
    const { error: submissionError } = await admin
      .from("facility_scout_submissions")
      .update({ status: "rewarded", updated_at: now })
      .in("id", submissionIds);
    if (submissionError) {
      console.error("[facilityscout/rewards] submission flip failed:", submissionError.message);
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facilityscout_reward_disbursed",
    p_target_table: "facility_scout_referrals",
    p_record_id: ids[0] ?? null,
    p_description: `${disbursed?.length ?? 0} data-bundle reward(s) marked sent`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { ids, total_mb: queue.reduce((sum, row) => sum + (row.reward_mb ?? 0), 0) },
  });

  return NextResponse.json({ ok: true, disbursed: disbursed?.length ?? 0 });
}
