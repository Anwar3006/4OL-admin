import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/search?q=<term>
 *
 * App-wide admin search (⌘K / Ctrl+K). Requires any platform admin with
 * dashboard.view (every admin role holds it); the cross-entity search
 * itself runs with the service-role client so results aren't limited by
 * per-table RLS.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("dashboard.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_global_search", {
    search_term: q,
    result_limit: 6,
  });

  if (error) {
    console.error("[admin/search] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
