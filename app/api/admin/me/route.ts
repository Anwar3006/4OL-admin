import { NextResponse } from "next/server";
import {
  adminAuthErrorResponse,
  getSessionPermissions,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";

/**
 * GET /api/admin/me
 *
 * Current caller's admin identity: role plus effective permission keys.
 * permissions === null signals super_admin (every permission implicitly).
 * Feeds nav filtering, page guards and the Roles matrix highlight.
 */
export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const permissions = await getSessionPermissions(auth);

  return NextResponse.json({
    userId: auth.user.id,
    email: auth.user.email ?? null,
    role: auth.role,
    permissions,
  });
}
