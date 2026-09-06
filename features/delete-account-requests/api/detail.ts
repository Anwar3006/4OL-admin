/**
 * PATCH /api/admin/delete-account-requests/[id] — lifecycle actions.
 * Gap Analysis Part Z (Z-D3): the first mutation surface for deletion
 * requests; deleteaccount.approve was previously granted but enforced
 * nowhere. Server-enforced state machine over Epic 21's 5-state CHECK:
 *
 *   verify           pending_review   -> in_verification
 *   begin_grace      in_verification  -> grace_period
 *   process_now      grace_period     -> completed (+ anonymization)
 *   cancel           any non-terminal -> cancelled
 *   remind_download  grace_period     -> audit-only (data download reminder)
 *   resend_otp       in_verification  -> audit-only (OTP re-trigger)
 *
 * Anonymization mirrors Epic 21's expire RPC field set exactly
 * (app-owned user_profiles columns only; auth.users untouched).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const SCHEMA = z.object({
  action: z.enum([
    "verify",
    "begin_grace",
    "process_now",
    "cancel",
    "remind_download",
    "resend_otp",
  ]),
  rejection_reason: z.string().max(500).optional(),
});

const TRANSITIONS: Record<string, { from: string[]; to: string | null }> = {
  verify: { from: ["pending_review"], to: "in_verification" },
  begin_grace: { from: ["in_verification"], to: "grace_period" },
  process_now: { from: ["grace_period"], to: "completed" },
  cancel: { from: ["pending_review", "in_verification", "grace_period"], to: "cancelled" },
  remind_download: { from: ["grace_period"], to: null },
  resend_otp: { from: ["in_verification"], to: null },
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("deleteaccount.approve");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: row, error: fetchError } = await admin
    .from("delete_account_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const transition = TRANSITIONS[parsed.data.action];
  if (!transition.from.includes(row.status)) {
    return NextResponse.json(
      { error: `Cannot ${parsed.data.action} a request in status "${row.status}"` },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (transition.to) patch.status = transition.to;
  if (parsed.data.action === "begin_grace") {
    patch.grace_period_started_at = nowIso;
    patch.reviewed_by = auth.user.id;
    patch.reviewed_at = nowIso;
  }
  if (parsed.data.action === "cancel") {
    patch.reviewed_by = auth.user.id;
    patch.reviewed_at = nowIso;
    patch.rejection_reason = parsed.data.rejection_reason ?? null;
  }
  if (parsed.data.action === "process_now") {
    patch.processed_at = nowIso;
    patch.processed_by = auth.user.id;
  }
  if (parsed.data.action === "remind_download" && !row.data_export_requested_at) {
    patch.data_export_requested_at = nowIso;
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await admin
      .from("delete_account_requests")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Grace start revokes login access immediately (matches the mobile app's
  // copy); cancel restores it. Mirrors setUserAuthBan() — GoTrue has no
  // "forever", so ~100 years.
  if (parsed.data.action === "begin_grace" || parsed.data.action === "cancel") {
    const banning = parsed.data.action === "begin_grace";
    const { error: banError } = await admin.auth.admin.updateUserById(row.user_id, {
      ban_duration: banning ? "876000h" : "none",
    });
    if (banError) {
      console.error(`[delete-account-requests/${parsed.data.action}] ban error:`, banError.message);
    }
    const { error: statusError } = await admin
      .from("user_profiles")
      .update({ status: banning ? "banned" : "active" })
      .eq("user_id", row.user_id);
    if (statusError) {
      console.error(`[delete-account-requests/${parsed.data.action}] profile status error:`, statusError.message);
    }
  }

  // process_now performs the same anonymization as the cron RPC.
  if (parsed.data.action === "process_now") {
    const { error: anonError } = await admin
      .from("user_profiles")
      .update({
        first_name: "Deleted",
        last_name: "User",
        phone_number: "deleted",
        avatar_url: null,
        dob: null,
        sex: null,
        notes: null,
        expo_push_token: null,
        status: "banned",
        deleted_at: nowIso,
      })
      .eq("user_id", row.user_id);
    if (anonError) {
      return NextResponse.json(
        { error: `Status updated but anonymization failed: ${anonError.message}` },
        { status: 500 },
      );
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `delete_request_${parsed.data.action}`,
    p_target_table: "delete_account_requests",
    p_record_id: id,
    p_description: `Deletion request ${parsed.data.action}${transition.to ? ` → ${transition.to}` : ""}`,
    p_severity: parsed.data.action === "process_now" ? "critical" : "warning",
    p_old_data: { status: row.status },
    p_new_data: patch,
  });

  return NextResponse.json({ ok: true, status: transition.to ?? row.status });
}
