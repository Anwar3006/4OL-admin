import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAdminRole, SUPER_ADMIN_ROLE, type AdminRole } from "@/lib/admin-roles";
import { ROLE_DEFAULTS } from "@/lib/permissions";
import { PermissionProviderClient } from "@/stores/permission-context";
import { ReactNode } from "react";

export const PermissionsProvider = async ({
  children,
}: {
  children: ReactNode;
}) => {
  // Read the session from cookies — set by proxy.ts on every request.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return (
      <PermissionProviderClient userRole={null} permissions={[]}>
        {children}
      </PermissionProviderClient>
    );
  }

  let role: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    role = data?.role ?? null;
  } catch (error) {
    console.error("[PermissionsProvider] Failed to fetch role:", error);
    return (
      <PermissionProviderClient userRole={null} permissions={[]}>
        {children}
      </PermissionProviderClient>
    );
  }

  // Effective permissions: null = super_admin (all implicit). Otherwise the
  // database is authoritative; ROLE_DEFAULTS is only a fallback before the
  // RBAC migration has been applied.
  let permissions: string[] | null = [];
  if (role === SUPER_ADMIN_ROLE) {
    permissions = null;
  } else if (isAdminRole(role)) {
    permissions = await resolvePermissions(user.id, role);
  }

  return (
    <PermissionProviderClient userRole={role} permissions={permissions}>
      {children}
    </PermissionProviderClient>
  );
};

async function resolvePermissions(userId: string, role: AdminRole): Promise<string[]> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("get_effective_admin_permissions", {
      p_user_id: userId,
    });
    if (error) throw error;
    return (data ?? []).map((row: { key: string }) => row.key);
  } catch (error) {
    console.warn(
      "[PermissionsProvider] get_effective_admin_permissions unavailable, " +
        "falling back to ROLE_DEFAULTS. Apply 20260817_rbac_permission_catalog.sql.",
      error,
    );
    return ROLE_DEFAULTS[role as Exclude<AdminRole, typeof SUPER_ADMIN_ROLE>] ?? [];
  }
}
