/**
 * POST /api/subscriptions/subscribers/remind — renewal/at-risk reminder
 * action. Moved from features/marketing/api/subscribers-remind.ts. Stamps
 * last_reminded_at AND writes a "marketing" notification into the shared
 * notifications table, which the mobile inbox/bell already reads
 * (/api/user/notifications allowlist). Accepts explicit ids or
 * { at_risk: true } for "Send All Reminders".
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const REMIND_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200).optional(),
  at_risk: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("subscriptions.manage");
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

  const admin = getAdminClient();
  const now = new Date().toISOString();

  // Resolve the target rows first so each subscriber gets an inbox message.
  let target = admin
    .from("user_subscriptions")
    .select("id, user_id, subscription_tiers(name)");
  if (parsed.data.ids) target = target.in("id", parsed.data.ids);
  else target = target.eq("status", "at_risk");

  const { data: rows, error: fetchError } = await target;
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const ids = (rows ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 });
  }

  const { data: reminded, error } = await admin
    .from("user_subscriptions")
    .update({ last_reminded_at: now, updated_at: now })
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Inbox delivery: one "marketing" notification per reminded subscriber.
  // Errors here are non-fatal — the stamp above is the source of truth.
  const notifications = (rows ?? []).map((row) => {
    const tier = Array.isArray(row.subscription_tiers)
      ? row.subscription_tiers[0]
      : row.subscription_tiers;
    return {
      user_id: row.user_id,
      title: "Your 4OurLife plan renewal",
      body: `Your ${tier?.name ?? "premium"} plan is due for renewal soon. Renew now to keep every benefit active.`,
      type: "marketing",
      metadata: { source: "subscriber_reminder", subscription_id: row.id },
    };
  });
  if (notifications.length > 0) {
    await admin.from("notifications").insert(notifications);
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "subscription_subscribers_reminded",
    p_target_table: "user_subscriptions",
    p_record_id: null,
    p_description: `Renewal reminders sent to ${reminded?.length ?? 0} subscriber(s)`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { count: reminded?.length ?? 0, at_risk: parsed.data.at_risk ?? false },
  });

  return NextResponse.json({ ok: true, reminded: reminded?.length ?? 0 });
}
