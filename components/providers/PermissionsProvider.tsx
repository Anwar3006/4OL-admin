import { getServerClient } from "@/lib/db/server";
import { getAdminClient } from "@/lib/db/admin";
import { isAdminRole, SUPER_ADMIN_ROLE, type AdminRole } from "@/lib/admin-roles";
import { ROLE_DEFAULTS, isRbacMigrationMissing } from "@/lib/permissions";
import { PermissionProviderClient } from "@/stores/permission-context";
import { ReactNode } from "react";

export const PermissionsProvider = async ({
  children,
}: {
  children: ReactNode;
}) => {
  // Read the session from cookies — set by proxy.ts on every request.
  const supabase = await getServerClient();
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
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("user_profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    // Mirror getAdminApiContext's suspended/banned check — otherwise a
    // suspended admin with a still-valid session sees a fully rendered nav
    // even though every API call the shell fires would be rejected.
    const status = data?.status ?? "active";
    role = status === "suspended" || status === "banned" ? null : (data?.role ?? null);
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
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_effective_admin_permissions", {
    p_user_id: userId,
  });

  if (!error) {
    return (data ?? []).map((row: { key: string }) => row.key);
  }

  if (isRbacMigrationMissing(error)) {
    console.warn(
      "[PermissionsProvider] get_effective_admin_permissions unavailable, " +
        "falling back to ROLE_DEFAULTS. Apply 20260817_rbac_permission_catalog.sql.",
      error,
    );
    return ROLE_DEFAULTS[role as Exclude<AdminRole, typeof SUPER_ADMIN_ROLE>] ?? [];
  }

  // Any other failure must fail closed — the static mirror has no concept of
  // DB-side per-user revokes, so degrading to it here could silently
  // re-grant a permission that was explicitly revoked.
  console.error("[PermissionsProvider] get_effective_admin_permissions RPC failed; denying.", error);
  return [];
}
