"use client";

import { usePermissions } from "@/hooks/usePermissions";

export const useAdminPermissions = () => {
  const { role, permissions, canPerform } = usePermissions();

  const canDo = (resource: string, action: string) =>
    canPerform(resource, action);

  return { filteredNavItems: [], canDo, role, permissions };
};
