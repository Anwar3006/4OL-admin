/**
 * /api/marketing/plans/[id] — plan catalog edits (`m-edit-plan`).
 * Gap Analysis Part M (M8).
 *
 * PATCH  → marketing.edit   — price/features/active flag
 * DELETE → marketing.delete — blocked while subscribers reference the plan
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PATCH_SCHEMA = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(1000).nullable().optional(),
  tier_type: z.string().min(1).max(40).optional(),
  price: z.number().nonnegative().optional(),
  period: z
    .enum(["free", "3days", "7days", "0.5month", "1month", "3months", "6months", "12months", "Lifetime"])
    .optional(),
  billing_cycle: z.enum(["monthly", "yearly", "one-time"]).optional(),
  privileges: z.array(z.string()).optional(),
  tier_limit: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("marketing_subscriptions")
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

  const admin = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await admin
    .from("marketing_subscriptions")
    .select("id, name, price")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("marketing_subscriptions")
    .update(parsed.data)
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
    p_target_table: "marketing_subscriptions",
    p_record_id: id,
    p_description: `Subscription plan "${existing.name}" updated`,
    p_severity: "info",
    p_old_data: { price: existing.price },
    p_new_data: parsed.data,
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
  const admin = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await admin
    .from("marketing_subscriptions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Never delete a plan with live subscribers — deactivate instead.
  const { count, error: countError } = await admin
    .from("user_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id)
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
    .from("marketing_subscriptions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_plan_deleted",
    p_target_table: "marketing_subscriptions",
    p_record_id: id,
    p_description: `Subscription plan "${existing.name}" deleted`,
    p_severity: "warning",
    p_old_data: { name: existing.name },
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
