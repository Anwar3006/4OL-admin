/**
 * /api/marketing/discounts
 * Gap Analysis Part M (M10): server-side discount management behind RBAC.
 *
 * GET  → marketing.view   — paginated list, search, status filter, KPI stats
 * POST → marketing.create — create code (eligible plans/users, campaign link)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STATUSES = ["active", "expired", "scheduled", "paused"];
const DISCOUNT_TYPES = ["percentage", "fixed", "bogo", "free_trial", "partner"];
const ELIGIBLE_USERS = ["all", "new", "nhis_linked", "free_plan"];

const CREATE_SCHEMA = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Codes may only contain letters, numbers, - and _"),
  discount_type: z.enum(DISCOUNT_TYPES as [string, ...string[]]),
  discount_value: z.number().nonnegative(),
  max_uses: z.number().int().positive().nullable().optional(),
  valid_from: z.string().min(1),
  valid_until: z.string().min(1).nullable().optional(),
  is_active: z.boolean().default(true),
  applies_to: z.enum(["all", "subscriptions", "specific"]).default("all"),
  applicable_items: z.array(z.unknown()).default([]),
  eligible_plans: z.array(z.string()).default([]),
  eligible_users: z.enum(ELIGIBLE_USERS as [string, ...string[]]).default("all"),
  per_user_limit: z.number().int().positive().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";

  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }
  if (type && !DISCOUNT_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type filter: ${type}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin.from("marketing_discounts").select("*", { count: "exact" });
  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("discount_type", type);

  const from = (page - 1) * limit;
  const [listResult, statsResult] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, from + limit - 1),
    admin.from("marketing_discounts").select("status, current_uses, discount_value, discount_type"),
  ]);

  if (listResult.error) {
    return NextResponse.json({ error: listResult.error.message }, { status: 500 });
  }
  if (statsResult.error) {
    return NextResponse.json({ error: statsResult.error.message }, { status: 500 });
  }

  const all = statsResult.data ?? [];
  const active = all.filter((d) => d.status === "active");
  const pct = active.filter((d) => d.discount_type === "percentage");
  const total = listResult.count ?? 0;

  // Merge linked campaign names (campaign_id FK only exists after the 0821
  // marketing extension — degrade gracefully when the migration is pending).
  const rows = (listResult.data ?? []) as Array<Record<string, unknown>>;
  const campaignIds = [
    ...new Set(
      rows
        .map((row) => row.campaign_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (campaignIds.length > 0) {
    const { data: campaigns } = await admin
      .from("marketing_profile")
      .select("id, name")
      .in("id", campaignIds);
    const nameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]));
    for (const row of rows) {
      row.campaign_name = nameById.get(row.campaign_id as string) ?? null;
    }
  }

  return NextResponse.json({
    data: rows,
    meta: { totalPages: Math.ceil(total / limit), total, currentPage: page },
    analytics: {
      active_codes: active.length,
      total_uses: all.reduce((sum, d) => sum + (d.current_uses ?? 0), 0),
      avg_discount_pct: pct.length
        ? Math.round(pct.reduce((sum, d) => sum + Number(d.discount_value ?? 0), 0) / pct.length)
        : 0,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("marketing.create");
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
    .from("marketing_discounts")
    .insert({
      ...parsed.data,
      created_by: auth.user.id,
      status: parsed.data.is_active ? "active" : "paused",
    })
    .select()
    .single();

  if (error || !created) {
    const duplicate = error?.message?.includes("duplicate") || error?.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "A discount with that code already exists" : (error?.message ?? "Failed to create discount") },
      { status: duplicate ? 409 : 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_discount_created",
    p_target_table: "marketing_discounts",
    p_record_id: created.id,
    p_description: `Discount code ${created.code} created`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { code: created.code, discount_type: created.discount_type },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
