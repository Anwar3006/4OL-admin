/**
 * /api/subscriptions/plans — subscription plan catalog.
 * Moved from features/marketing/api/plans.ts as part of the subscriptions
 * consolidation (Marketing's Subscriptions tab + Settings' Plans tab + this
 * page's own half-built shell -> one surface). Plans are `subscription_tiers`
 * — the SAME catalog the mobile paywall (get_subscription_tiers) and
 * entitlement (get_my_entitlement) consume, so anything created/edited here
 * unlocks premium on the consumer app instantly.
 *
 * GET  -> subscriptions.view    — tiers with subscriber counts
 * POST -> subscriptions.manage  — create tier
 *
 * Permission note: this used to be marketing.view/marketing.edit (Marketing)
 * and settings.billing (Settings, price/duration/active only). Both are gone.
 * subscriptions.manage already existed in the permission catalog
 * ("Grant or revoke premium/lifetime subscriptions") but nothing checked it —
 * this is the wire-up. The `admin` role already holds both subscriptions.view
 * and subscriptions.manage by default, same as it held marketing.edit, so no
 * existing admin loses access.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const CREATE_SCHEMA = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().default(0),
  duration_days: z.number().int().positive().max(3650).nullable().optional(),
  benefits: z.array(z.string().max(200)).max(30).default([]),
  is_active: z.boolean().default(true),
  product_scope: z.enum(["full_access", "plasence", "fitness"]),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export async function GET() {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [tiersResult, subsResult] = await Promise.all([
    admin.from("subscription_tiers").select("*").order("display_order", { ascending: true }),
    admin.from("user_subscriptions").select("tier_id, status"),
  ]);

  if (tiersResult.error) {
    return NextResponse.json({ error: tiersResult.error.message }, { status: 500 });
  }
  if (subsResult.error) {
    return NextResponse.json({ error: subsResult.error.message }, { status: 500 });
  }

  const counts = new Map<string, { total: number; active: number }>();
  for (const row of subsResult.data ?? []) {
    if (!row.tier_id) continue;
    const entry = counts.get(row.tier_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (row.status === "active") entry.active += 1;
    counts.set(row.tier_id, entry);
  }

  const data = (tiersResult.data ?? []).map((tier) => ({
    ...tier,
    subscribers: counts.get(tier.id)?.total ?? 0,
    active_subscribers: counts.get(tier.id)?.active ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("subscriptions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CREATE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const baseKey = slugify(parsed.data.name);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(baseKey)) {
    return NextResponse.json(
      { error: "Plan name must contain letters or digits" },
      { status: 400 },
    );
  }
  const key =
    parsed.data.product_scope === "full_access"
      ? baseKey
      : `${parsed.data.product_scope}_${baseKey}`.slice(0, 40);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) {
    return NextResponse.json(
      { error: "Plan name must contain letters or digits" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: created, error } = await admin
    .from("subscription_tiers")
    .insert({
      key,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price_ghs: parsed.data.price,
      duration_days: parsed.data.duration_days ?? null,
      benefits: parsed.data.benefits,
      is_active: parsed.data.is_active,
      display_order: 9,
      product_scope: parsed.data.product_scope,
    })
    .select()
    .single();

  if (error || !created) {
    const duplicate = error?.message?.includes("duplicate") || error?.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "A plan with that name already exists" : (error?.message ?? "Failed to create plan") },
      { status: duplicate ? 409 : 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "subscription_plan_created",
    p_target_table: "subscription_tiers",
    p_record_id: created.id,
    p_description: `Subscription plan "${created.name}" created`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: {
      name: created.name,
      price_ghs: created.price_ghs,
      product_scope: created.product_scope,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
