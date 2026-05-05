import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PermissionProviderClient } from "@/stores/permission-context";
import { ReactNode } from "react";

export const PermissionsProvider = async ({
  children,
}: {
  children: ReactNode;
}) => {
  // Read the session from cookies — set by middleware on every request.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
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
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    userInfo = data;
  } catch (error) {
    console.error("[PermissionsProvider] Failed to fetch role:", error);
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
