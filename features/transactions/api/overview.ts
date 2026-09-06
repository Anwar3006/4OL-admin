/**
 * /api/transactions/overview
 * Gap Analysis Part AA: aggregated finance KPIs behind RBAC with the
 * Super-Admin metric-visibility gate applied server-side.
 *
 * GET → transactions.view — KPIs, monthly revenue, payment-method split,
 * service-fee totals, subscription KPIs, failed-payment summary, tax summary
 * and expense buckets. super_admin sees everything; every other role only
 * sees metrics the SA left visible in finance_visibility_config.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getAdminClient } from "@/lib/db/admin";

const METRIC_MAP: Record<string, string> = {
  "kpis.total_transactions": "total_transactions",
  "kpis.total_revenue": "total_revenue",
  "kpis.total_customers": "total_customers",
  "kpis.gross_profit": "gross_profit",
  monthly: "revenue_chart",
  payment_methods: "payment_methods",
  service_fees: "service_fee_revenue",
  subscriptions: "subscription_kpis",
  tax: "tax_liability",
  expenses: "total_revenue", // P&L surfaces tie to revenue visibility + SA route gate
};

function maskForRole(overview: Record<string, unknown>, hidden: Set<string>) {
  const masked: Record<string, unknown> = { ...overview };
  for (const [path, metricKey] of Object.entries(METRIC_MAP)) {
    if (!hidden.has(metricKey)) continue;
    if (path.includes(".")) {
      const [top, sub] = path.split(".");
      const section = (masked[top] ?? {}) as Record<string, unknown>;
      masked[top] = { ...section, [sub]: null, [`${sub}_hidden`]: true };
    } else {
      masked[path] = null;
      masked[`${path}_hidden`] = true;
    }
  }
  return masked;
}

export async function GET() {
  const auth = await requireAdminApiUser("transactions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getAdminClient();
    const [rpc, visResult] = await Promise.all([
      admin.rpc("get_transactions_overview"),
      admin.from("finance_visibility_config").select("metric_key, visible_to_finance"),
    ]);

    if (rpc.error || !rpc.data) {
      // Pre-migration graceful degradation: report no data yet.
      return NextResponse.json({
        ok: true,
        empty: true,
        overview: null,
        reason: rpc.error?.message ?? "overview unavailable",
      });
    }

    const overview = rpc.data as Record<string, unknown>;
    if (overview.error) {
      return NextResponse.json({ ok: true, empty: true, overview: null, reason: String(overview.error) });
    }

    if (auth.role === SUPER_ADMIN_ROLE) {
      return NextResponse.json({ ok: true, empty: false, overview, hidden_metrics: [] });
    }

    const hidden = new Set<string>();
    for (const row of visResult.data ?? []) {
      if (row.visible_to_finance === false) hidden.add(row.metric_key);
    }
    return NextResponse.json({
      ok: true,
      empty: false,
      overview: maskForRole(overview, hidden),
      hidden_metrics: [...hidden],
    });
  } catch {
    return NextResponse.json({ error: "Failed to load finance overview" }, { status: 500 });
  }
}
