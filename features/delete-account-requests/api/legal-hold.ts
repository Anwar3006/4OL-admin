/**
 * GET/POST/PATCH /api/admin/delete-account-requests/legal-hold — Epic 3.4.
 * A legal hold is keyed by user_id, not by a delete_account_requests row: it
 * has to block purge_or_anonymize_user() (triggered by an admin or the
 * grace-period cron) and anonymize_expired_financial_records() (the 7-year
 * sweep) alike, and the latter can fire long after a request is "completed".
 * So placing a hold isn't gated to any particular request status.
 *
 * GET is read-only (deleteaccount.view — same gate as seeing the request
 * list this renders inside). POST/PATCH require legalholds.manage.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PLACE_SCHEMA = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
  matter_reference: z.string().max(200).optional(),
});

const RELEASE_SCHEMA = z.object({
  hold_id: z.string().uuid(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("deleteaccount.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const userIdsParam = new URL(request.url).searchParams.get("user_ids");
  const userIds = (userIdsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (userIds.length === 0) return NextResponse.json({ holds: [] });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("legal_holds")
    .select("id, user_id, reason, matter_reference, placed_by, placed_at")
    .in("user_id", userIds)
    .is("released_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holds: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("legalholds.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PLACE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  const { data: existing } = await admin
    .from("legal_holds")
    .select("id")
    .eq("user_id", parsed.data.user_id)
    .is("released_at", null)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "This user already has an active legal hold." }, { status: 409 });
  }

  const { data: row, error } = await admin
    .from("legal_holds")
    .insert({
      user_id: parsed.data.user_id,
      reason: parsed.data.reason,
      matter_reference: parsed.data.matter_reference ?? null,
      placed_by: auth.user.id,
    })
    .select("id, user_id, reason, matter_reference, placed_by, placed_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "legal_hold_placed",
    p_target_table: "legal_holds",
    p_record_id: row.id,
    p_description: `Legal hold placed on user ${parsed.data.user_id}: ${parsed.data.reason}`,
    p_severity: "critical",
    p_new_data: row,
  });

  return NextResponse.json({ ok: true, hold: row });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser("legalholds.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RELEASE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: row, error: fetchError } = await admin
    .from("legal_holds")
    .select("*")
    .eq("id", parsed.data.hold_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Legal hold not found" }, { status: 404 });
  if (row.released_at) return NextResponse.json({ error: "Legal hold already released" }, { status: 409 });

  const { error: updateError } = await admin
    .from("legal_holds")
    .update({ released_by: auth.user.id, released_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "legal_hold_released",
    p_target_table: "legal_holds",
    p_record_id: row.id,
    p_description: `Legal hold released on user ${row.user_id}`,
    p_severity: "critical",
    p_old_data: { released_at: null },
  });

  return NextResponse.json({ ok: true });
}
