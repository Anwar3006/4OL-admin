"use client";
import { useState, useEffect, useCallback } from "react";
import { getBrowserClient } from "@/lib/db/browser";
import { getUserProfile } from "@/actions/user.actions";
import {
  isRouteAllowed,
  canPerformAction,
  getAllowedRoutes,
  getAllowedMenuItems,
} from "@/utils/permission-helper";
import type { UserPermission } from "@/constant/permissions";

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      if (typeof window !== "undefined") {
        const storedPermissions = localStorage.getItem("user_permissions");
        const storedRole = localStorage.getItem("user_role");

        if (storedPermissions && storedRole) {
          setPermissions(JSON.parse(storedPermissions));
          setRole(storedRole);
          setLoading(false);
          return;
        }
      }

      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user;

      const fallbackUserId =
        typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const userId = sessionUser?.id || fallbackUserId;

      if (sessionUser && typeof window !== "undefined") {
        localStorage.setItem("user_id", sessionUser.id);
        if (sessionUser.email) {
          localStorage.setItem("user_email", sessionUser.email);
        }
      }

      if (userId) {
        const { data, error } = await getUserProfile();

        if (!error && data) {
          // `user_profiles` has no `permissions` column — access is role-based,
          // so this is ALWAYS empty and every lookup below resolves against it.
          // Typing it makes that explicit rather than letting TypeScript infer
          // `never[]` and error at each call site. The RBAC actually enforced
          // is in lib/permissions.ts behind requireAdminApiUser().
          const userPermissions: UserPermission[] = [];
          const userRole = data.role || "";

          setPermissions(userPermissions);
          setRole(userRole);

          if (typeof window !== "undefined") {
            localStorage.setItem(
              "user_permissions",
              JSON.stringify(userPermissions)
            );
            localStorage.setItem("user_role", userRole);
          }
        }
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPermissions = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_permissions");
      localStorage.removeItem("user_role");
    }
    await loadPermissions();
  }, []);

  const isSuperAdmin = useCallback(() => {
    return role === "Super Admin";
  }, [role]);

  const hasPermission = useCallback(
    (resource: string) => {
      if (isSuperAdmin()) return true;
      return permissions.some((p) => p.resource === resource);
    },
    [permissions, isSuperAdmin]
  );

  const canAccessRoute = useCallback(
    (route: string) => {
      if (isSuperAdmin()) return true;
      return isRouteAllowed(route, permissions);
    },
    [permissions, isSuperAdmin]
  );

  const canPerform = useCallback(
    (resource: string, action: string) => {
      if (isSuperAdmin()) return true;
      return canPerformAction(resource, action, permissions);
    },
    [permissions, isSuperAdmin]
  );

  const getAllowedRoutesForUser = useCallback(() => {
    if (isSuperAdmin()) return ["*"];
    return getAllowedRoutes(permissions);
  }, [permissions, isSuperAdmin]);

  const getAllowedMenuItemsForUser = useCallback(() => {
    if (isSuperAdmin()) return ["*"];
    return getAllowedMenuItems(permissions);
  }, [permissions, isSuperAdmin]);

  const getUserPermissions = useCallback(() => {
    return permissions;
  }, [permissions]);

  const getUserRole = useCallback(() => {
    return role;
  }, [role]);

  const getAllowedActions = useCallback(
    (resource: string): string[] => {
      if (isSuperAdmin()) {
        return [
          "view",
          "add",
          "edit",
          "delete",
          "approve",
          "create",
          "download",
          "archive",
        ];
      }

      const permission = permissions.find((p) => p.resource === resource);
      if (!permission) return [];

      const permissionLevel = permission.assignedPermission;

      if (permissionLevel === "View Only") {
        return ["view"];
      } else if (permissionLevel.includes("Add, Edit")) {
        return ["view", "add", "edit"];
      } else if (permissionLevel === "Full Access") {
        return ["view", "add", "edit", "delete", "approve", "create"];
      }

      const actions = permissionLevel
        .toLowerCase()
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      if (actions.length > 0 && !actions.includes("view")) {
        actions.unshift("view");
      }

      return actions;
    },
    [permissions, isSuperAdmin]
  );

  const hasAnyPermission = useCallback(() => {
    return isSuperAdmin() || permissions.length > 0;
  }, [permissions, isSuperAdmin]);

  return {
    permissions,
    role,
    loading,
    isSuperAdmin,
    hasPermission,
    canAccessRoute,
    canPerform,
    hasAnyPermission,
    getAllowedRoutesForUser,
    getAllowedMenuItemsForUser,
    getUserPermissions,
    getUserRole,
    getAllowedActions,
    refreshPermissions,
  };
};

export default usePermissions;
