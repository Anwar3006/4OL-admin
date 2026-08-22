/**
 * /api/transactions/visibility
 * Gap Analysis Part AA: Super-Admin metric-visibility governance.
 *
 * GET → super_admin only — current visibility config for finance metrics.
 * PUT → super_admin only — bulk toggle which metrics finance_admin et al. see.
 *
 * Enforcement happens server-side in /api/transactions/overview and
 * /api/transactions/tax; this endpoint only manages the config.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PUT_SCHEMA = z.object({
  metrics: z.array(
    z.object({
      metric_key: z.string().min(1).max(60),
      visible_to_finance: z.boolean(),
    }),
  ),
});

export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json({ error: "Only a super admin can manage metric visibility" }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("finance_visibility_config")
      .select("*")
      .order("metric_key");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, metrics: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load visibility config" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json({ error: "Only a super admin can manage metric visibility" }, { status: 403 });
  }

  let body: z.infer<typeof PUT_SCHEMA>;
  try {
    body = PUT_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    for (const metric of body.metrics) {
      const { error } = await admin.from("finance_visibility_config").upsert(
        {
          metric_key: metric.metric_key,
          visible_to_finance: metric.visible_to_finance,
          updated_by: auth.user.id,
          updated_at: now,
        },
        { onConflict: "metric_key" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "finance.visibility_updated",
      target_table: "finance_visibility_config",
      new_data: { metrics: body.metrics },
    });

    return NextResponse.json({ ok: true, updated: body.metrics.length });
  } catch {
    return NextResponse.json({ error: "Failed to save visibility config" }, { status: 500 });
  }
}
