// components/PermissionGuard.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import Loading from "./Loading";

/**
 * Higher Order Component to protect routes based on permissions
 * Wraps page components to ensure user has required permissions before rendering
 *
 * @param {Component} Component - The component to protect
 * @param {String} requiredResource - The permission resource required
 * @param {String} requiredAction - Optional action required (default: 'view')
 * @returns {Component} Protected component
 *
 * @example
 * export default withPermissions(UserManagementPage, "Manage users", "view");
 */
export const withPermissions = (
  Component,
  requiredResource,
  requiredAction = "view"
) => {
  return function PermissionGuardedComponent(props) {
    const router = useRouter();
    const { canPerform, hasPermission, loading, isSuperAdmin } =
      usePermissions();
    const [isChecking, setIsChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
      if (!loading) {
        checkPermissions();
      }
    }, [loading]);

    const checkPermissions = () => {
      // Super Admin has access to everything
      if (isSuperAdmin()) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Check if user has the required permission and action
      const allowed = requiredAction
        ? canPerform(requiredResource, requiredAction)
        : hasPermission(requiredResource);

      if (!allowed) {
        // Redirect to unauthorized page
        router.push("/unauthorized");
        return;
      }

      setHasAccess(true);
      setIsChecking(false);
    };

    // Show loading while checking permissions
    if (loading || isChecking) {
      return <Loading />;
    }

    // Only render component if user has access
    if (!hasAccess) {
      return null;
    }

    return <Component {...props} />;
  };
};

/**
 * Unauthorized page component
 * Shows 403 access denied message
 *
 * @example
 * // In app/(dashboard)/unauthorized/page.jsx
 * export default function Unauthorized() {
 *   return <UnauthorizedPage />;
 * }
 */
export const UnauthorizedPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full px-6">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mb-8">
            <svg
              className="mx-auto h-24 w-24 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Code */}
          <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-4">
            403
          </h1>

          {/* Error Title */}
          <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Access Denied
          </h2>

          {/* Error Message */}
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
            You don't have permission to access this page. Please contact your
            administrator if you believe this is an error.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="btn bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push("/analytics")}
              className="btn bg-[#56ce84] hover:bg-[#45bd73] text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component-level permission checker
 * Conditionally renders children based on permissions
 *
 * @param {String} resource - The permission resource required
 * @param {String} action - Optional action required (default: 'view')
 * @param {ReactNode} fallback - Optional fallback content to show if no permission
 * @param {ReactNode} children - Content to render if permission is granted
 *
 * @example
 * <PermissionCheck resource="Manage users" action="edit">
 *   <button>Edit User</button>
 * </PermissionCheck>
 *
 * @example
 * <PermissionCheck
 *   resource="Facilities Management"
 *   action="delete"
 *   fallback={<span className="text-gray-400">No access</span>}
 * >
 *   <button>Delete Facility</button>
 * </PermissionCheck>
 */
export const PermissionCheck = ({
  resource,
  action = "view",
  fallback = null,
  children,
}) => {
  const { canPerform, hasPermission, isSuperAdmin, loading } = usePermissions();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Check if user has access
  const hasAccess =
    isSuperAdmin() ||
    (action ? canPerform(resource, action) : hasPermission(resource));

  // Render fallback if no access
  if (!hasAccess) {
    return fallback;
  }

  // Render children if has access
  return <>{children}</>;
};

/**
 * Hook to check permissions within a component
 * Returns access status and loading state
 *
 * @param {String} resource - The permission resource required
 * @param {String} action - Optional action required
 * @returns {Object} { hasAccess: Boolean, loading: Boolean }
 *
 * @example
 * function MyComponent() {
 *   const { hasAccess, loading } = usePermissionCheck("Manage users", "delete");
 *
 *   if (loading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {hasAccess && <button>Delete User</button>}
 *     </div>
 *   );
 * }
 */
export const usePermissionCheck = (resource, action = null) => {
  const { canPerform, hasPermission, isSuperAdmin, loading } = usePermissions();

  const hasAccess = loading
    ? false
    : isSuperAdmin() ||
      (action ? canPerform(resource, action) : hasPermission(resource));

  return { hasAccess, loading };
};

/**
 * Component to show different content based on permission
 * Useful for showing different UI based on permission level
 *
 * @param {String} resource - The permission resource
 * @param {ReactNode} viewOnly - Content for view-only permission
 * @param {ReactNode} canEdit - Content for edit permission
 * @param {ReactNode} fullAccess - Content for full access
 *
 * @example
 * <PermissionSwitch
 *   resource="Facilities Management"
 *   viewOnly={<div>View Mode</div>}
 *   canEdit={<div>Edit Mode</div>}
 *   fullAccess={<div>Admin Mode</div>}
 * />
 */
export const PermissionSwitch = ({
  resource,
  viewOnly = null,
  canEdit = null,
  fullAccess = null,
}) => {
  const { canPerform, isSuperAdmin, loading } = usePermissions();

  if (loading) return null;

  if (isSuperAdmin() || canPerform(resource, "delete")) {
    return fullAccess;
  }

  if (canPerform(resource, "edit")) {
    return canEdit || fullAccess;
  }

  if (canPerform(resource, "view")) {
    return viewOnly || canEdit || fullAccess;
  }

  return null;
};

/**
 * Hook to get all allowed actions for a resource
 * Useful for conditionally rendering multiple buttons/actions
 *
 * @param {String} resource - The permission resource
 * @returns {Object} Object with boolean flags for each action
 *
 * @example
 * function FacilityActions() {
 *   const actions = useResourceActions("Facilities Management");
 *
 *   return (
 *     <div>
 *       {actions.canView && <button>View</button>}
 *       {actions.canAdd && <button>Add</button>}
 *       {actions.canEdit && <button>Edit</button>}
 *       {actions.canDelete && <button>Delete</button>}
 *     </div>
 *   );
 * }
 */
export const useResourceActions = (resource) => {
  const { canPerform, hasPermission, isSuperAdmin, loading } = usePermissions();

  if (loading) {
    return {
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canCreate: false,
      loading: true,
    };
  }

  return {
    canView: isSuperAdmin() || hasPermission(resource),
    canAdd: isSuperAdmin() || canPerform(resource, "add"),
    canEdit: isSuperAdmin() || canPerform(resource, "edit"),
    canDelete: isSuperAdmin() || canPerform(resource, "delete"),
    canApprove: isSuperAdmin() || canPerform(resource, "approve"),
    canCreate: isSuperAdmin() || canPerform(resource, "create"),
    loading: false,
  };
};

export default withPermissions;
