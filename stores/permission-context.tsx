"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

/**
 * Client-side RBAC context.
 *
 * permissions === null means super_admin: every permission is implicitly
 * held. An array lists the caller's effective permission keys (role
 * defaults plus grants minus revokes, computed server-side by
 * PermissionsProvider). UI filtering only — the API re-enforces every key.
 */
interface PermissionContextType {
  userRole: string | null;
  permissions: string[] | null;
  hasPermission: (key: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProviderClient = ({
  userRole,
  permissions,
  children,
}: {
  userRole: string | null;
  permissions: string[] | null;
  children: ReactNode;
}) => {
  const value = useMemo<PermissionContextType>(() => {
    const set = new Set(permissions ?? []);
    return {
      userRole,
      permissions,
      hasPermission: (key: string) => permissions === null || set.has(key),
    };
  }, [userRole, permissions]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error(
      "usePermissionContext must be used within a PermissionProviderClient",
    );
  }
  return context;
};

/** Convenience hook for one-off checks in pages and buttons. */
export const useHasPermission = (key: string) =>
  usePermissionContext().hasPermission(key);
