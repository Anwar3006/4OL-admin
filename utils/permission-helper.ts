import { PERMISSION_MAPPINGS, type UserPermission } from "@/constants/permissions";

/**
 * Helper function to get all allowed routes for a user's permissions
 * @param {Array} userPermissions - Array of permission objects
 * @returns {Array} Array of allowed route patterns
 */
export const getAllowedRoutes = (userPermissions: UserPermission[]): string[] => {
  if (!userPermissions || userPermissions.length === 0) return [];

  const allowedRoutes = new Set<string>();

  userPermissions.forEach((permission) => {
    const mapping = PERMISSION_MAPPINGS[permission.resource];
    if (mapping && mapping.routes) {
      mapping.routes.forEach((route) => allowedRoutes.add(route));
    }
  });

  return Array.from(allowedRoutes);
};

/**
 * Helper function to get all allowed menu items for a user's permissions
 * @param {Array} userPermissions - Array of permission objects
 * @returns {Array} Array of allowed menu item titles
 */
export const getAllowedMenuItems = (userPermissions: UserPermission[]): string[] => {
  if (!userPermissions || userPermissions.length === 0) return [];

  const allowedItems = new Set<string>();

  userPermissions.forEach((permission) => {
    const mapping = PERMISSION_MAPPINGS[permission.resource];
    if (mapping && mapping.menuItems) {
      mapping.menuItems.forEach((item) => allowedItems.add(item));
    }
  });

  return Array.from(allowedItems);
};

/**
 * Check if a route is allowed for user permissions
 * @param {String} route - The route to check
 * @param {Array} userPermissions - Array of permission objects
 * @returns {Boolean} True if route is allowed
 */
export const isRouteAllowed = (route: string, userPermissions: UserPermission[]): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;

  // Check if any permission grants access to this route
  return userPermissions.some((permission) => {
    const mapping = PERMISSION_MAPPINGS[permission.resource];
    if (!mapping || !mapping.routes) return false;

    // Check exact match or if route starts with allowed route
    return mapping.routes.some(
      (allowedRoute) =>
        route === allowedRoute || route.startsWith(allowedRoute + "/")
    );
  });
};

/**
 * Check if user can perform a specific action on a resource
 * @param {String} resource - The permission resource
 * @param {String} action - The action to check (view, add, edit, delete, etc.)
 * @param {Array} userPermissions - Array of permission objects
 * @returns {Boolean} True if action is allowed
 */
export const canPerformAction = (
  resource: string,
  action: string,
  userPermissions: UserPermission[],
): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;

  const userPermission = userPermissions.find((p) => p.resource === resource);
  if (!userPermission) return false;

  const mapping = PERMISSION_MAPPINGS[resource];
  if (!mapping || !mapping.actions) return false;

  const allowedActions = mapping.actions[userPermission.assignedPermission];
  return allowedActions && allowedActions.includes(action);
};
