import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Billing & GRA tab (Gap Analysis Part P, P-D5). Infra cost budgets are live;
 * revenue KPIs remain "—" in the UI until the transactions source (K-D7)
 * ships — this route intentionally returns no revenue figures of its own.
 */
export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("infra_cost_budgets")
    .select("id, service, provider, budget_30d, usage_30d, notes")
    .order("budget_30d", { ascending: false });

  if (error) {
    // Table ships with the 20260820 migration; degrade to an empty list so
    // the tab renders its honest empty state before apply.
    console.error("[settings/billing] Supabase error:", error.message);
    return NextResponse.json({ costs: [] });
  }

  return NextResponse.json({ costs: data ?? [] });
}
