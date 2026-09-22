/**
 * GET /api/providers/queues — the four admin home queues from P0-14:
 * credentials to review, catalogue items to review, credentials expiring
 * within 30 days, and pending onboarding requests. Capped at 20 rows per
 * queue — this is a "what needs my attention" surface, not a full list
 * (each links back to the filtered Providers list or the credential/
 * catalogue tab for the rest).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderQueuesResponse } from "../schema/types";

const QUEUE_LIMIT = 20;

export async function GET() {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getAdminClient();
  const expiresBefore = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const [credentialsRes, catalogueRes, expiringRes, onboardingRes] = await Promise.all([
    supabase
      .from("provider_credentials")
      .select(
        "id, provider_id, credential_type, number, document_path, issued_at, expires_at, status, rejection_reason, reviewed_by, reviewed_at, created_at, providers (name)",
        { count: "exact" },
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(QUEUE_LIMIT),
    supabase
      .from("provider_catalogue_items")
      .select(
        "id, provider_id, item_type, name, description, category, capability_required, price, currency, unit, duration_minutes, stock_status, status, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at, providers (name)",
        { count: "exact" },
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(QUEUE_LIMIT),
    supabase
      .from("provider_credentials")
      .select(
        "id, provider_id, credential_type, number, document_path, issued_at, expires_at, status, rejection_reason, reviewed_by, reviewed_at, created_at, providers (name)",
        { count: "exact" },
      )
      .eq("status", "verified")
      .not("expires_at", "is", null)
      .lte("expires_at", expiresBefore)
      .order("expires_at", { ascending: true })
      .limit(QUEUE_LIMIT),
    supabase
      .from("onboarding_requests")
      .select("id, business_name, first_name, last_name, email, phone_number, request_type, status, created_at", {
        count: "exact",
      })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(QUEUE_LIMIT),
  ]);

  for (const res of [credentialsRes, catalogueRes, expiringRes, onboardingRes]) {
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const withProviderName = (rows: any[] | null) =>
    (rows ?? []).map((row) => {
      const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers;
      const { providers, ...rest } = row;
      return { ...rest, provider_name: provider?.name ?? "Unknown provider" };
    });

  const payload: ProviderQueuesResponse = {
    credentialsToReview: {
      count: credentialsRes.count ?? 0,
      items: withProviderName(credentialsRes.data),
    },
    catalogueToReview: {
      count: catalogueRes.count ?? 0,
      items: withProviderName(catalogueRes.data),
    },
    expiringSoon: {
      count: expiringRes.count ?? 0,
      items: withProviderName(expiringRes.data),
    },
    onboardingRequests: {
      count: onboardingRes.count ?? 0,
      items: onboardingRes.data ?? [],
    },
  };

  return NextResponse.json(payload);
}
