import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Users menu KPI row (adds NHIS-Linked per gap doc C.4). RPC-first with
// head-count fallback while the users_ibp_extension migration is unapplied.

export async function GET() {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_user_kpi_stats");
  if (!error && data) {
    return NextResponse.json({ stats: data, source: "rpc" });
  }

  const head = async (table: string, filters?: (q: any) => any) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filters) q = filters(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [total, active, flagged, deleteRequests] = await Promise.all([
    head("user_profiles", (q) => q.eq("role", "user")),
    head("user_profiles", (q) => q.eq("role", "user").eq("status", "active")),
    head(
      "content_moderation_flags",
      (q) => q.eq("content_type", "profile").eq("status", "pending_review"),
    ),
    head("delete_account_requests", (q) => q.eq("status", "pending")),
  ]);

  return NextResponse.json({
    stats: {
      total_users: total,
      active_30d: active,
      premium: 0, // user_subscriptions is pre-Epic-16 — honest zero.
      nhis_linked: 0, // nhis_number column appears with the migration.
      flagged,
      delete_requests_pending: deleteRequests,
    },
    source: "fallback",
  });
}
