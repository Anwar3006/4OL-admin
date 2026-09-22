/**
 * GET /api/providers/[id]/subscription — for the Subscription tab.
 * Read-only here: checkout (P1-07) and premium activation both live in the
 * existing /subscriptions admin module; this just surfaces the provider's
 * current row so an admin doesn't have to cross-reference by hand.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderSubscriptionRow } from "../schema/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("facility_subscriptions")
    .select(
      "id, facility_id, subscription_id, status, billing_cycle, auto_renew, started_at, current_period_end, cancelled_at, marketing_subscriptions (name)",
    )
    .eq("facility_id", id)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ProviderSubscriptionRow[] = (data ?? []).map((row: any) => {
    const sub = Array.isArray(row.marketing_subscriptions) ? row.marketing_subscriptions[0] : row.marketing_subscriptions;
    return { ...row, subscription_name: sub?.name ?? null };
  });

  return NextResponse.json({ data: rows });
}
