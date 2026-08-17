import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { ADMIN_ROLES, SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * RBAC matrix management.
 *
 * GET  /api/admin/rbac        — full matrix: roles, catalog, defaults, overrides
 * PUT  /api/admin/rbac        — replace a role's default permission set
 *
 * The RBAC tables are RLS-locked with no client policies, so every read and
 * write here goes through the service-role client after the caller has been
 * permission-checked. roles.view gates reads, roles.edit gates writes; both
 * default to super_admin only.
 */

export async function GET() {
  const auth = await requireAdminApiUser("roles.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();

  const [rolesRes, defaultsRes, overridesRes] = await Promise.all([
    admin.from("admin_platform_roles").select("*").order("sort_order"),
    admin.from("admin_role_permissions").select("role,permission_key"),
    admin
      .from("admin_user_overrides")
      .select("user_id,permission_key,effect,reason,created_at,granted_by"),
  ]);

  if (rolesRes.error || defaultsRes.error || overridesRes.error) {
    console.error(
      "[admin/rbac] Supabase error:",
      rolesRes.error?.message ?? defaultsRes.error?.message ?? overridesRes.error?.message,
    );
    return NextResponse.json(
      { error: "Failed to load RBAC matrix. Has 20260817_rbac_permission_catalog.sql been applied?" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    roles: rolesRes.data ?? [],
    rolePermissions: defaultsRes.data ?? [],
    overrides: overridesRes.data ?? [],
  });
}

const PutRoleDefaultsSchema = z.object({
  role: z.enum(ADMIN_ROLES.filter((r) => r !== SUPER_ADMIN_ROLE) as [string, ...string[]]),
  permissionKeys: z.array(z.enum(PERMISSION_KEYS as [string, ...string[]])),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("roles.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = PutRoleDefaultsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { role, permissionKeys } = parsed.data;

  const { error: deleteError } = await admin
    .from("admin_role_permissions")
    .delete()
    .eq("role", role);

  if (deleteError) {
    console.error("[admin/rbac PUT] delete error:", deleteError.message);
    return NextResponse.json({ error: "Failed to update role defaults." }, { status: 500 });
  }

  if (permissionKeys.length > 0) {
    const { error: insertError } = await admin
      .from("admin_role_permissions")
      .insert(permissionKeys.map((permission_key) => ({ role, permission_key })));

    if (insertError) {
      console.error("[admin/rbac PUT] insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to update role defaults." }, { status: 500 });
    }
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_name: auth.role,
    action_type: "rbac_role_defaults_updated",
    target_table: "admin_role_permissions",
    record_id: role,
    new_data: { permission_count: permissionKeys.length },
  });

  return NextResponse.json({ success: true });
}
