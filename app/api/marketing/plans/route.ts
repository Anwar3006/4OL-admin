/**
 * /api/marketing/plans — subscription plan catalog (`marketing_subscriptions`).
 * Gap Analysis Part M (M8): plan cards + `m-edit-plan` + Create Plan.
 * Subscriber counts aggregate over user_subscriptions.
 *
 * GET  → marketing.view  — plans with subscriber counts
 * POST → marketing.edit  — create plan (m-edit-plan writes catalog)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PERIODS = [
  "free",
  "3days",
  "7days",
  "0.5month",
  "1month",
  "3months",
  "6months",
  "12months",
  "Lifetime",
];
const BILLING_CYCLES = ["monthly", "yearly", "one-time"];

const CREATE_SCHEMA = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(1000).optional(),
  tier_type: z.string().min(1).max(40),
  price: z.number().nonnegative().default(0),
  period: z.enum(PERIODS as [string, ...string[]]).default("1month"),
  billing_cycle: z.enum(BILLING_CYCLES as [string, ...string[]]).default("monthly"),
  privileges: z.array(z.string()).default([]),
  tier_limit: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const [plansResult, subsResult] = await Promise.all([
    admin.from("marketing_subscriptions").select("*").order("price", { ascending: true }),
    admin.from("user_subscriptions").select("plan_id, status"),
  ]);

  if (plansResult.error) {
    return NextResponse.json({ error: plansResult.error.message }, { status: 500 });
  }
  if (subsResult.error) {
    return NextResponse.json({ error: subsResult.error.message }, { status: 500 });
  }

  const counts = new Map<string, { total: number; active: number }>();
  for (const row of subsResult.data ?? []) {
    const entry = counts.get(row.plan_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (row.status === "active") entry.active += 1;
    counts.set(row.plan_id, entry);
  }

  const data = (plansResult.data ?? []).map((plan) => ({
    ...plan,
    subscribers: counts.get(plan.id)?.total ?? 0,
    active_subscribers: counts.get(plan.id)?.active ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("marketing.edit");
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

  const admin = getSupabaseAdmin();
  const { data: created, error } = await admin
    .from("marketing_subscriptions")
    .insert({ ...parsed.data, created_by: auth.user.id })
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
    p_action_type: "marketing_plan_created",
    p_target_table: "marketing_subscriptions",
    p_record_id: created.id,
    p_description: `Subscription plan "${created.name}" created`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { name: created.name, price: created.price },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
