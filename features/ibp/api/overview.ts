import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// IBP menu KPIs. RPC-first with head-count fallback while the
// users_ibp_extension migration is unapplied.

export async function GET() {
  const auth = await requireAdminApiUser("ibp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_ibp_kpi_stats");
  if (!error && data) {
    return NextResponse.json({ stats: data, source: "rpc" });
  }

  const head = async (table: string, filters?: (q: any) => any) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filters) q = filters(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [total, active, pending, premium, suspended] = await Promise.all([
    head("ibp"),
    head("ibp", (q) => q.eq("status", "active")),
    head("ibp", (q) => q.eq("status", "pending")),
    head("ibp", (q) => q.eq("is_featured", true)),
    head("ibp", (q) => q.eq("status", "suspended")),
  ]);

  return NextResponse.json({
    stats: {
      total,
      active_published: active,
      pending_verification: pending,
      premium,
      products_published: 0,
      products_pending: 0,
      suspended,
    },
    source: "fallback",
  });
}
