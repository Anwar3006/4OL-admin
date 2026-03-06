"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface PermissionContextType {
  userRole: string | null;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProviderClient = ({
  userRole,
  children,
}: {
  userRole: string | null;
  children: ReactNode;
}) => {
  return (
    <PermissionContext.Provider value={{ userRole }}>
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
