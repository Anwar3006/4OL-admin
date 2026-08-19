import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, getSessionPermissions, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/search?q=<term>
 *
 * App-wide admin search (⌘K / Ctrl+K). Requires any platform admin with
 * dashboard.view (every admin role holds it); the cross-entity search
 * itself runs with the service-role client so results aren't limited by
 * per-table RLS — results are filtered below by the caller's actual
 * per-resource view permission instead, so a role without e.g. hcp.view
 * can't use search to see records its own pages would refuse to show it.
 */

// Mirrors AdminSearchDialog.tsx's SearchResult["entity_type"] union.
const ENTITY_VIEW_PERMISSION: Record<string, string> = {
  condition: "diseases.view",
  symptom: "symptoms.view",
  facility: "facilities.view",
  user: "users.view",
  job: "jobs.view",
  faq: "faq.view",
  healthy_living: "healthyliving.view",
  exercise: "fitness.view",
};

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

  // null permissions = super_admin, which sees every entity type.
  const permissions = await getSessionPermissions(auth);
  const results = (data ?? []).filter((row: { entity_type: string }) => {
    if (permissions === null) return true;
    const required = ENTITY_VIEW_PERMISSION[row.entity_type];
    return required ? permissions.includes(required) : false;
  });

  return NextResponse.json({ results });
}
