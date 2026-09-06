/**
 * GET  /api/admin/profile  — caller's own admin profile (whitelisted fields).
 * PATCH /api/admin/profile — self-service edit of the whitelisted fields.
 *
 * Gap Analysis Part W (W-D1/W-D2): replaces the modal's old browser-client
 * select('*') read, which leaked whitelisted_ips / notes / login_attempts.
 * No permission key — every admin manages their own profile.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z
  .object({
    first_name: z.string().min(1).max(80).optional(),
    last_name: z.string().min(1).max(80).optional(),
    phone_number: z
      .string()
      .min(7)
      .max(20)
      .regex(/^[+\d][\d\s\-()]*$/, "Invalid phone number")
      .optional(),
    department: z.string().max(80).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "No fields to update" });

const PROFILE_FIELDS =
  "first_name,last_name,phone_number,department,location,role,status,mfa_enabled,last_login_at,created_at,avatar_url,public_id";

export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: profile ?? null,
    email: auth.user.email ?? null,
    // Human-facing account number (4OL-000001) shown on the top-nav chip and
    // the modal subtitle. Kept out of `profile` so the PATCH round-trip below
    // can't be tricked into treating it as an editable field.
    publicId: (profile as { public_id?: string | null } | null)?.public_id ?? null,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Self-service edits are audit-logged like any other admin mutation.
  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "profile_update",
    p_target_table: "user_profiles",
    p_record_id: auth.user.id,
    p_description: "Updated own admin profile",
    p_severity: "info",
    p_new_data: parsed.data,
  });

  return NextResponse.json({ profile: data });
}
