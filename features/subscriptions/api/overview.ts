/**
 * GET /api/subscriptions/overview — the subscriber-facing slice of
 * get_marketing_overview() (Premium Users, MRR, Retention %, At-Risk).
 *
 * That RPC bundles subscriber KPIs with campaign/discount KPIs in one jsonb
 * payload (supabase/migrations/20260822_marketing_unification.sql). This
 * route reuses it rather than duplicating the SQL, and returns only the
 * `subscribers` slice — the campaign/discount numbers stay Marketing's
 * concern (features/marketing/api/analytics.ts computes its own
 * `performance` object from marketing_profile directly and never read the
 * RPC's `overview` field, so no duplicate call is needed there; that call
 * was removed rather than kept for a value nothing consumed).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export type TSubscriptionsOverview = {
  premium_users: number;
  at_risk: number;
  retention_pct: number;
  mrr: number;
};

const EMPTY: TSubscriptionsOverview = { premium_users: 0, at_risk: 0, retention_pct: 0, mrr: 0 };

export async function GET() {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_marketing_overview");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const overview = (data ?? {}) as { subscribers?: Partial<TSubscriptionsOverview> };
  const subscribers: TSubscriptionsOverview = {
    premium_users: overview.subscribers?.premium_users ?? EMPTY.premium_users,
    at_risk: overview.subscribers?.at_risk ?? EMPTY.at_risk,
    retention_pct: overview.subscribers?.retention_pct ?? EMPTY.retention_pct,
    mrr: overview.subscribers?.mrr ?? EMPTY.mrr,
  };

  return NextResponse.json({ subscribers });
}
