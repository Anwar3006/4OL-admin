/**
 * /api/marketing/plans/[id] — plan catalog edits (`m-edit-plan`).
 * Gap Analysis Part M (M8), rebased onto `subscription_tiers` by the
 * marketing unification build.
 *
 * PATCH  → marketing.edit   — price/benefits/name/active flag
 * DELETE → marketing.delete — blocked while subscribers reference the tier
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().nonnegative().optional(),
  duration_days: z.number().int().positive().max(3650).nullable().optional(),
  benefits: z.array(z.string().max(200)).max(30).optional(),
  is_active: z.boolean().optional(),
  product_scope: z.enum(["full_access", "plasence", "fitness"]).optional(),
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
    .from("subscription_tiers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
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
    .from("subscription_tiers")
    .select("id, name, price_ghs")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.price !== undefined) update.price_ghs = parsed.data.price;
  if (parsed.data.duration_days !== undefined) update.duration_days = parsed.data.duration_days;
  if (parsed.data.benefits !== undefined) update.benefits = parsed.data.benefits;
  if (parsed.data.is_active !== undefined) update.is_active = parsed.data.is_active;
  if (parsed.data.product_scope !== undefined)
    update.product_scope = parsed.data.product_scope;

  const { data: updated, error: updateError } = await admin
    .from("subscription_tiers")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update plan" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_plan_updated",
    p_target_table: "subscription_tiers",
    p_record_id: id,
    p_description: `Subscription plan "${existing.name}" updated`,
    p_severity: "info",
    p_old_data: { price_ghs: existing.price_ghs },
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
    .from("subscription_tiers")
    .select("id, name, key")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Core entitlement tiers are structural — the mobile app branches on them.
  if (["free", "premium", "lifetime"].includes(existing.key)) {
    return NextResponse.json(
      { error: "Core tiers (Free/Premium/Lifetime) cannot be deleted — deactivate instead" },
      { status: 409 },
    );
  }

  // Never delete a plan with live subscribers — deactivate instead.
  const { count, error: countError } = await admin
    .from("user_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("tier_id", id)
    .eq("status", "active");

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Plan has active subscribers — deactivate it instead of deleting" },
      { status: 409 },
    );
  }

  const { error: deleteError } = await admin
    .from("subscription_tiers")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_plan_deleted",
    p_target_table: "subscription_tiers",
    p_record_id: id,
    p_description: `Subscription plan "${existing.name}" deleted`,
    p_severity: "warning",
    p_old_data: { name: existing.name },
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
