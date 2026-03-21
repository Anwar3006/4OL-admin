import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PermissionProviderClient } from "@/stores/permission-context";
import { headers } from "next/headers";
import { ReactNode } from "react";

export const PermissionsProvider = async ({
  children,
}: {
  children: ReactNode;
}) => {
  const betterAuthUserSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!betterAuthUserSession?.user) {
    return (
      <PermissionProviderClient userRole={null}>
        {children}
      </PermissionProviderClient>
    );
  }

  let userInfo;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", betterAuthUserSession.user.id)
      .single();

    if (error) throw error;
    userInfo = data;
  } catch (error) {
    console.error("Auth server-side error:", error);
    return (
      <PermissionProviderClient userRole={null}>
        {children}
      </PermissionProviderClient>
    );
  }

  return (
    <PermissionProviderClient userRole={userInfo?.role || null}>
      {children}
    </PermissionProviderClient>
  );
};
