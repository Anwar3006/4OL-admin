// hooks/usePermissions.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/app/utils/supabaseClient";
import {
  isRouteAllowed,
  canPerformAction,
  getAllowedRoutes,
  getAllowedMenuItems,
} from "@/utils/permission-helper";

/**
 * Custom hook to manage user permissions
 * Provides comprehensive permission checking utilities
 * @returns {Object} Permission utilities and user permissions
 */
export const usePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  /**
   * Load permissions from localStorage or fetch from database
   */
  const loadPermissions = async () => {
    try {
      setLoading(true);

      // Try to get from localStorage first (faster)
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

      // If not in localStorage, fetch from database
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

      if (userId) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("permissions, role")
          .eq("id", userId)
          .single();

        if (!error && data) {
          const userPermissions = data.permissions || [];
          const userRole = data.role || "";

          setPermissions(userPermissions);
          setRole(userRole);

          // Store in localStorage for faster access next time
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

  /**
   * Refresh permissions from database (useful after permission updates)
   */
  const refreshPermissions = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_permissions");
      localStorage.removeItem("user_role");
    }
    await loadPermissions();
  }, []);

  /**
   * Check if user is Super Admin (has all permissions)
   * @returns {Boolean} True if user is Super Admin
   */
  const isSuperAdmin = useCallback(() => {
    return role === "Super Admin";
  }, [role]);

  /**
   * Check if user has access to a specific resource
   * @param {String} resource - The permission resource name
   * @returns {Boolean} True if user has permission
   */
  const hasPermission = useCallback(
    (resource) => {
      if (isSuperAdmin()) return true;
      return permissions.some((p) => p.resource === resource);
    },
    [permissions, isSuperAdmin]
  );

  /**
   * Check if user can access a specific route
   * @param {String} route - The route path
   * @returns {Boolean} True if route is accessible
   */
  const canAccessRoute = useCallback(
    (route) => {
      if (isSuperAdmin()) return true;
      return isRouteAllowed(route, permissions);
    },
    [permissions, isSuperAdmin]
  );

  /**
   * Check if user can perform a specific action on a resource
   * @param {String} resource - The permission resource name
   * @param {String} action - The action (view, add, edit, delete, etc.)
   * @returns {Boolean} True if action is allowed
   */
  const canPerform = useCallback(
    (resource, action) => {
      if (isSuperAdmin()) return true;
      return canPerformAction(resource, action, permissions);
    },
    [permissions, isSuperAdmin]
  );

  /**
   * Get all routes user has access to
   * @returns {Array} Array of allowed routes
   */
  const getAllowedRoutesForUser = useCallback(() => {
    if (isSuperAdmin()) return ["*"]; // Super admin has access to all routes
    return getAllowedRoutes(permissions);
  }, [permissions, isSuperAdmin]);

  /**
   * Get all menu items user has access to
   * @returns {Array} Array of allowed menu item titles
   */
  const getAllowedMenuItemsForUser = useCallback(() => {
    if (isSuperAdmin()) return ["*"]; // Super admin has access to all menu items
    return getAllowedMenuItems(permissions);
  }, [permissions, isSuperAdmin]);

  /**
   * Get user's full permissions array
   * @returns {Array} Array of permission objects
   */
  const getUserPermissions = useCallback(() => {
    return permissions;
  }, [permissions]);

  /**
   * Get user's role
   * @returns {String} User role
   */
  const getUserRole = useCallback(() => {
    return role;
  }, [role]);

  /**
   * Get allowed actions for a specific resource
   * @param {String} resource - The permission resource name
   * @returns {Array} Array of allowed actions
   */
  const getAllowedActions = useCallback(
    (resource) => {
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

      // Parse the assignedPermission string to get actions
      const permissionLevel = permission.assignedPermission;

      // Map permission levels to actions based on common patterns
      if (permissionLevel === "View Only") {
        return ["view"];
      } else if (permissionLevel.includes("Add, Edit")) {
        return ["view", "add", "edit"];
      } else if (permissionLevel === "Full Access") {
        return ["view", "add", "edit", "delete", "approve", "create"];
      }

      // Parse custom permission strings (e.g., "Create, Edit")
      const actions = permissionLevel
        .toLowerCase()
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      // Always include 'view' if any other action is present
      if (actions.length > 0 && !actions.includes("view")) {
        actions.unshift("view");
      }

      return actions;
    },
    [permissions, isSuperAdmin]
  );

  /**
   * Check if user has any permissions at all
   * @returns {Boolean} True if user has at least one permission
   */
  const hasAnyPermission = useCallback(() => {
    return isSuperAdmin() || permissions.length > 0;
  }, [permissions, isSuperAdmin]);

  return {
    // State
    permissions,
    role,
    loading,

    // Permission checks
    isSuperAdmin,
    hasPermission,
    canAccessRoute,
    canPerform,
    hasAnyPermission,

    // Getters
    getAllowedRoutesForUser,
    getAllowedMenuItemsForUser,
    getUserPermissions,
    getUserRole,
    getAllowedActions,

    // Actions
    refreshPermissions,
  };
};

export default usePermissions;
