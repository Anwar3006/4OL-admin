/**
 * /api/marketing/discounts/[id]
 * Gap Analysis Part M (M10): edit incl. pause/resume lifecycle, delete.
 *
 * PATCH  → marketing.edit   — partial update; status transitions audited
 * DELETE → marketing.delete
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  discount_type: z.enum(["percentage", "fixed", "bogo", "free_trial", "partner"]).optional(),
  discount_value: z.number().nonnegative().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  valid_from: z.string().min(1).optional(),
  valid_until: z.string().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
  applies_to: z.enum(["all", "subscriptions", "specific"]).optional(),
  applicable_items: z.array(z.unknown()).optional(),
  eligible_plans: z.array(z.string()).optional(),
  eligible_users: z.enum(["all", "new", "nhis_linked", "free_plan"]).optional(),
  per_user_limit: z.number().int().positive().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "expired", "scheduled", "paused"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("marketing_discounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

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
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("marketing_discounts")
    .select("id, code, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  const update = { ...parsed.data };
  // Keep the legacy flag coherent when the lifecycle status flips.
  if (update.status === "paused") update.is_active = false;
  if (update.status === "active") update.is_active = true;

  const { data: updated, error: updateError } = await admin
    .from("marketing_discounts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update discount" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_discount_updated",
    p_target_table: "marketing_discounts",
    p_record_id: id,
    p_description: `Discount code ${existing.code} updated`,
    p_severity: "info",
    p_old_data: { status: existing.status },
    p_new_data: update,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("marketing_discounts")
    .select("id, code")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  const { error: deleteError } = await admin
    .from("marketing_discounts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_discount_deleted",
    p_target_table: "marketing_discounts",
    p_record_id: id,
    p_description: `Discount code ${existing.code} deleted`,
    p_severity: "warning",
    p_old_data: { code: existing.code },
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
