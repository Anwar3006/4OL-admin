/**
 * POST /api/admin/profile/end-other-sessions — retire the caller's other
 * admin_sessions telemetry rows (Gap Analysis Part W, W-D5).
 *
 * Honest limitation: admin browser sessions are Supabase JWTs and cannot
 * be revoked before expiry (GoTrue has no server-side revocation list),
 * so this performs audit-grade session-record invalidation only. The
 * modal surfaces that limitation rather than implying instant logout.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isRbacMigrationMissing } from "@/lib/permissions";

export async function POST() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("end_other_admin_sessions", {
    p_admin_id: auth.user.id,
    p_reason: "ended_by_admin_self_service",
  });

  if (error) {
    if (isRbacMigrationMissing(error)) {
      return NextResponse.json(
        { error: "Apply 20260821_admin_profile_extension.sql to enable this action." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions_ended: Number(data ?? 0) });
}
