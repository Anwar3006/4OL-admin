/**
 * PATCH /api/marketing/subscribers/[id] — subscriber lifecycle edits from the
 * marketing Subscriptions tab (Cancel / toggle auto-renew / mark at-risk).
 * Marketing unification build. Writes the unified user_subscriptions table.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  status: z.enum(["active", "at_risk", "cancelled", "expired"]).optional(),
  auto_renew: z.boolean().optional(),
  risk_reason: z.string().max(500).nullable().optional(),
});

export async function PATCH(
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

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: parsed.success ? "No fields to update" : (parsed.error.issues[0]?.message ?? "Invalid payload") },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
  }

  const { data: updated, error } = await admin
    .from("user_subscriptions")
    .update(update)
    .eq("id", id)
    .select("id, status, auto_renew")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_subscriber_updated",
    p_target_table: "user_subscriptions",
    p_record_id: id,
    p_description: `Subscriber row updated (${Object.keys(parsed.data).join(", ")})`,
    p_severity: parsed.data.status === "cancelled" ? "warning" : "info",
    p_old_data: null,
    p_new_data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}
