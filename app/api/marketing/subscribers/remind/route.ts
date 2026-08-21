/**
 * POST /api/marketing/subscribers/remind — renewal/at-risk reminder action.
 * Gap Analysis Part M (M9): stamps last_reminded_at; actual delivery rides
 * the Notifications interconnection (notification_campaigns) when wired.
 * Accepts explicit ids or { at_risk: true } for "Send All Reminders".
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const REMIND_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200).optional(),
  at_risk: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("marketing.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = REMIND_SCHEMA.safeParse(body);
  if (!parsed.success || (!parsed.data.ids && !parsed.data.at_risk)) {
    return NextResponse.json(
      { error: 'Provide subscription "ids" or { "at_risk": true }' },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  let update = admin
    .from("user_subscriptions")
    .update({ last_reminded_at: now, updated_at: now });

  if (parsed.data.ids) update = update.in("id", parsed.data.ids);
  else update = update.eq("status", "at_risk");

  const { data: reminded, error } = await update.select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_subscribers_reminded",
    p_target_table: "user_subscriptions",
    p_record_id: null,
    p_description: `Renewal reminders queued for ${reminded?.length ?? 0} subscriber(s)`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { count: reminded?.length ?? 0, at_risk: parsed.data.at_risk ?? false },
  });

  return NextResponse.json({ ok: true, reminded: reminded?.length ?? 0 });
}
