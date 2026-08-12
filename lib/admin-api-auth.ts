import { getSupabaseServerClient } from "@/lib/supabase-server";

const ADMIN_ROLES = ["super_admin", "admin", "registrar"];

export async function getAdminApiUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
    return null;
  }

  return user;
}
