import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { ADMIN_ROLES } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("security.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();

  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select("user_id, first_name, last_name, mfa_enabled, whitelisted_ips")
    .in("role", ADMIN_ROLES);

  if (profilesError) {
    console.error("[admin/security-overview] profiles error:", profilesError.message);
    return NextResponse.json({ error: "Failed to load admin security overview." }, { status: 500 });
  }

  const { data: sessions, error: sessionsError } = await admin
    .from("admin_sessions")
    .select("id, admin_id, device_info, user_agent, ip_address, started_at")
    .eq("is_active", true)
    .order("started_at", { ascending: false });

  if (sessionsError) {
    console.error("[admin/security-overview] sessions error:", sessionsError.message);
    return NextResponse.json({ error: "Failed to load active sessions." }, { status: 500 });
  }

  const nameByAdminId = new Map(
    (profiles ?? []).map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "—"]),
  );

  return NextResponse.json({
    admins: (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
      mfa_enabled: Boolean(p.mfa_enabled),
      whitelisted_ips: p.whitelisted_ips ?? [],
    })),
    sessions: (sessions ?? []).map((s) => ({
      id: s.id,
      admin_name: nameByAdminId.get(s.admin_id) || "Unknown Admin",
      device_info: s.device_info,
      user_agent: s.user_agent,
      ip_address: s.ip_address,
      started_at: s.started_at,
    })),
  });
}
