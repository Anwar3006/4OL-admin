/**
 * /api/transactions/rates
 * Gap Analysis Part AA: service charge rate editor (SA-only writes).
 *
 * GET → transactions.view — current rates + service-fee revenue context
 * PUT → super_admin only — bulk rate updates (mockup "Save Rates" button)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PUT_SCHEMA = z.object({
  rates: z.array(
    z.object({
      key: z.string().min(1).max(60),
      rate_pct: z.number().min(0).max(100),
    }),
  ),
});

export async function GET() {
  const auth = await requireAdminApiUser("transactions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("service_charge_rates").select("*").order("key");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rates: data ?? [], can_edit: auth.role === SUPER_ADMIN_ROLE });
  } catch {
    return NextResponse.json({ error: "Failed to load service charge rates" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiUser("transactions.rates");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: z.infer<typeof PUT_SCHEMA>;
  try {
    body = PUT_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    for (const rate of body.rates) {
      const { error } = await admin
        .from("service_charge_rates")
        .update({ rate_pct: rate.rate_pct, updated_by: auth.user.id, updated_at: now })
        .eq("key", rate.key);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "transactions.rates_updated",
      target_table: "service_charge_rates",
      new_data: { rates: body.rates },
    });

    return NextResponse.json({ ok: true, updated: body.rates.length });
  } catch {
    return NextResponse.json({ error: "Failed to save rates" }, { status: 500 });
  }
}
