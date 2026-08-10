import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/search?q=<term>
 *
 * App-wide admin search (⌘K / Ctrl+K). Authenticates the caller via the
 * Supabase session cookie (same pattern the admin shell already uses for
 * supabase.auth.getUser()), then runs the cross-entity search with the
 * service-role client so results aren't limited by per-table RLS.
 */
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
