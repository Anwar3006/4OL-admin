/**
 * GET /api/admin/profile/access — the caller's own effective permissions
 * and their recorded admin sessions.
 *
 * Backs the "Access & Security" tab of the top-nav profile modal. Everything
 * here is scoped to auth.user.id, so it is self-service like the rest of
 * /api/admin/profile/* — an admin may always inspect their own access.
 *
 * Permission resolution deliberately mirrors PermissionsProvider: the
 * `get_effective_admin_permissions` RPC is authoritative (it accounts for
 * per-user grants and revokes), ROLE_DEFAULTS is used only while the RBAC
 * migration is unapplied, and any other RPC failure fails closed rather than
 * showing the admin a more generous list than they actually hold.
 */

import { NextResponse } from "next/server";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SUPER_ADMIN_ROLE, type AdminRole } from "@/lib/admin-roles";
import {
  PERMISSION_CATALOG,
  ROLE_DEFAULTS,
  isRbacMigrationMissing,
} from "@/lib/permissions";

const SESSION_LIMIT = 10;

export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const isSuperAdmin = auth.role === SUPER_ADMIN_ROLE;

  let permissionKeys: string[] | null = null;
  let source: "rpc" | "role_defaults" | "super_admin" | "denied" = "super_admin";

  if (!isSuperAdmin) {
    const { data, error } = await admin.rpc("get_effective_admin_permissions", {
      p_user_id: auth.user.id,
    });

    if (!error) {
      permissionKeys = (data ?? []).map((row: { key: string }) => row.key);
      source = "rpc";
    } else if (isRbacMigrationMissing(error)) {
      permissionKeys =
        ROLE_DEFAULTS[auth.role as Exclude<AdminRole, typeof SUPER_ADMIN_ROLE>] ??
        [];
      source = "role_defaults";
    } else {
      permissionKeys = [];
      source = "denied";
    }
  }

  // Group into the catalog's resources so the modal can render sections
  // instead of a flat wall of dotted keys.
  const held = permissionKeys === null ? null : new Set(permissionKeys);
  const groups = new Map<
    string,
    { key: string; action: string; description: string; granted: boolean }[]
  >();

  for (const def of PERMISSION_CATALOG) {
    const list = groups.get(def.resource) ?? [];
    list.push({
      key: def.key,
      action: def.action,
      description: def.description,
      granted: held === null || held.has(def.key),
    });
    groups.set(def.resource, list);
  }

  const permissionGroups = [...groups.entries()]
    .map(([resource, items]) => ({
      resource,
      items,
      grantedCount: items.filter((i) => i.granted).length,
    }))
    // Resources the admin holds nothing in sink to the bottom but stay
    // visible — knowing what you *cannot* reach is half the point.
    .sort(
      (a, b) =>
        Number(b.grantedCount > 0) - Number(a.grantedCount > 0) ||
        a.resource.localeCompare(b.resource),
    );

  const { data: sessions } = await admin
    .from("admin_sessions")
    .select(
      "id, ip_address, user_agent, device_info, location, started_at, last_active_at, ended_at, is_active, mfa_verified",
    )
    .eq("admin_id", auth.user.id)
    .order("last_active_at", { ascending: false })
    .limit(SESSION_LIMIT);

  return NextResponse.json({
    role: auth.role,
    isSuperAdmin,
    source,
    totalPermissions: PERMISSION_CATALOG.length,
    grantedPermissions:
      permissionKeys === null ? PERMISSION_CATALOG.length : permissionKeys.length,
    permissionGroups,
    sessions: sessions ?? [],
  });
}
