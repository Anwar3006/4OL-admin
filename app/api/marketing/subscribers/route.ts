/**
 * GET /api/marketing/subscribers — unified user_subscriptions joined to the
 * subscription_tiers catalog and masked user profiles (K5 pattern via
 * lib/masking). Gap Analysis Part M (M8/M9), rebased by the marketing
 * unification build: tier_id -> subscription_tiers (the live entitlement
 * source), plus payment-method and renewal-window filters from the mockup.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { applyUserMasking } from "@/lib/masking";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STATUSES = ["active", "at_risk", "cancelled", "expired", "revoked"];

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const status = url.searchParams.get("status") ?? "";
  const tierId = url.searchParams.get("plan") ?? "";
  const paymentMethod = url.searchParams.get("payment_method") ?? "";
  const renewBefore = url.searchParams.get("renew_before") ?? "";

  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }
  if (renewBefore && Number.isNaN(Date.parse(renewBefore))) {
    return NextResponse.json({ error: "Invalid renew_before date" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_subscriptions")
    .select(
      "id, user_id, tier_id, status, source, subscribed_at, starts_at, expires_at, next_renewal_at, payment_method, auto_renew, risk_reason, last_reminded_at, cancelled_at, subscription_tiers(id, key, name, price_ghs, duration_days), user_profiles(user_id, first_name, last_name, email, phone_number)",
      { count: "exact" },
    );
  if (status) query = query.eq("status", status);
  if (tierId) query = query.eq("tier_id", tierId);
  if (paymentMethod) query = query.eq("payment_method", paymentMethod);
  if (renewBefore) {
    // Renewal window: rows whose next renewal (or expiry) falls before the
    // given date — nulls excluded so lifetime grants never match.
    query = query.not("next_renewal_at", "is", null).lte("next_renewal_at", renewBefore);
  }

  const from = (page - 1) * limit;
  const result = await query
    .order("subscribed_at", { ascending: false })
    .range(from, from + limit - 1);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const isSuperAdmin = auth.role === "super_admin";
  const data = (result.data ?? []).map((row) => {
    const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    const masked = applyUserMasking(profile ?? {}, isSuperAdmin);
    return {
      ...row,
      user_profiles: {
        user_id: masked.user_id,
        first_name: masked.first_name ?? null,
        last_name: masked.last_name ?? null,
        email: masked.email ?? null,
        phone_number: masked.phone_number ?? null,
      },
    };
  });

  const total = result.count ?? 0;
  return NextResponse.json({
    data,
    meta: { totalPages: Math.ceil(total / limit), total, currentPage: page },
  });
}
