import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  price: z.number().nonnegative().max(100000).optional(),
  tier_limit: z.number().int().min(1).max(10000).optional(),
  department_limit: z.number().int().min(1).max(1000).optional(),
  is_active: z.boolean().optional(),
});

export async function listProviderPlans() {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const admin = getAdminClient();
  const [plans, subscriptions] = await Promise.all([
    admin.from("marketing_subscriptions")
      .select("id,name,description,price,period,billing_cycle,privileges,tier_limit,department_limit,is_active,created_at")
      .in("tier_type", ["provider", "enterprise"])
      .order("price", { ascending: true }),
    admin.from("facility_subscriptions").select("subscription_id,status,current_period_end"),
  ]);
  if (plans.error) return NextResponse.json({ error: plans.error.message }, { status: 500 });
  if (subscriptions.error) return NextResponse.json({ error: subscriptions.error.message }, { status: 500 });
  const now = Date.now();
  const active = new Map<string, number>();
  for (const row of subscriptions.data ?? []) {
    if (row.status !== "active" || (row.current_period_end && new Date(row.current_period_end).getTime() <= now)) continue;
    active.set(row.subscription_id, (active.get(row.subscription_id) ?? 0) + 1);
  }
  return NextResponse.json({ data: (plans.data ?? []).map((plan) => ({ ...plan, active_subscribers: active.get(plan.id) ?? 0 })) });
}

export async function updateProviderPlan(request: Request, id: string) {
  const auth = await requireAdminApiUser("subscriptions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const parsed = PATCH_SCHEMA.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  const admin = getAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("marketing_subscriptions").select("id,name,price,tier_limit,department_limit")
    .eq("id", id).in("tier_type", ["provider", "enterprise"]).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Provider plan not found" }, { status: 404 });
  const { data, error } = await admin.from("marketing_subscriptions")
    .update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update plan" }, { status: 500 });
  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id, p_action_type: "provider_subscription_plan_updated",
    p_target_table: "marketing_subscriptions", p_record_id: id,
    p_description: `Provider plan "${existing.name}" updated`, p_severity: "info",
    p_old_data: existing, p_new_data: parsed.data,
  });
  return NextResponse.json({ data });
}
