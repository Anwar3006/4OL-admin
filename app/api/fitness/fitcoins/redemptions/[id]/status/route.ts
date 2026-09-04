import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * PATCH /api/fitness/fitcoins/redemptions/[id]/status — FitCoins redemption
 * moderation queue (Mapping Audit G2). Coins are reserved at request time
 * (redeem_fitcoin_reward); this route moves a redemption through
 * pending -> approved -> fulfilled, or pending -> rejected (refunds coins).
 */

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject", "fulfill"]),
  reason: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("fitcoins.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  if (parsed.data.action === "reject" && !parsed.data.reason) {
    return NextResponse.json({ error: "A reason is required to reject a redemption" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_review_fitcoin_redemption", {
    p_redemption_id: id,
    p_action: parsed.data.action,
    p_admin_id: auth.user.id,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `fitcoin_redemption_${parsed.data.action}`,
    p_target_table: "fitcoin_rewards_redemption",
    p_record_id: id,
    p_description: `Redemption ${id} ${parsed.data.action}ed${parsed.data.reason ? `: ${parsed.data.reason}` : ""}`,
    p_severity: parsed.data.action === "reject" ? "warning" : "info",
  });

  return NextResponse.json({ success: true, redemption: data });
}
