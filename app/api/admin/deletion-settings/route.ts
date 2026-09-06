/**
 * GET/PATCH /api/admin/deletion-settings — platform_settings.deletion_settings.
 * Gap Analysis Part Z (Z-D1): grace window, OTP expiry, auto-processing and
 * download-reminder values, editable from the Delete Account Requests
 * Settings tab. Read needs deleteaccount.view; writing needs
 * settings.security (policy-changing values).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const DEFAULTS = {
  grace_days: 30,
  otp_expiry_mins: 10,
  auto_process: true,
  data_download_reminder_days: 7,
};

const PATCH_SCHEMA = z.object({
  grace_days: z.number().int().min(1).max(90).optional(),
  otp_expiry_mins: z.number().int().min(1).max(60).optional(),
  auto_process: z.boolean().optional(),
  data_download_reminder_days: z.number().int().min(1).max(30).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("deleteaccount.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("deletion_settings")
    .eq("id", "global")
    .maybeSingle();

  if (error && !error.message?.toLowerCase().includes("does not exist")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: { ...DEFAULTS, ...((data?.deletion_settings as object) ?? {}) },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: parsed.success ? "No fields to update" : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: current } = await admin
    .from("platform_settings")
    .select("deletion_settings")
    .eq("id", "global")
    .maybeSingle();

  const merged = {
    ...DEFAULTS,
    ...((current?.deletion_settings as object) ?? {}),
    ...parsed.data,
  };

  const { error } = await admin
    .from("platform_settings")
    .upsert({
      id: "global",
      deletion_settings: merged,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "deletion_settings_update",
    p_target_table: "platform_settings",
    p_record_id: "global",
    p_description: "Updated account-deletion policy settings",
    p_severity: "warning",
    p_new_data: parsed.data,
  });

  return NextResponse.json({ settings: merged });
}
