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
import { getAdminClient } from "@/lib/db/admin";

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

  const admin = getAdminClient();
  let query = admin
    .from("user_subscriptions")
    .select(
      // No `email` in the user_profiles embed: that column does not exist, and
      // asking for it fails the WHOLE query — "column user_profiles_1.email
      // does not exist" — which 500'd this endpoint and left the Subscribers
      // tab empty. Email lives in auth.users and is resolved below. Same bug,
      // same cause, as the one already fixed in app/api/map/collectors.
      "id, user_id, tier_id, status, source, subscribed_at, starts_at, expires_at, next_renewal_at, payment_method, auto_renew, risk_reason, last_reminded_at, cancelled_at, subscription_tiers(id, key, name, price_ghs, duration_days), user_profiles(user_id, first_name, last_name, phone_number)",
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

  // Resolve the page's emails from auth.users. PostgREST cannot reach that
  // schema, so this is a service-role lookup — the same approach
  // app/api/admin/delete-account-requests uses. The installed auth-js (2.105.3)
  // has no server-side filter on listUsers, so pages are scanned client-side;
  // this stops as soon as every id on the page is accounted for, which for a
  // page of `limit` subscribers is almost always the first call.
  const wantedIds = new Set(
    (result.data ?? []).map((row) => (row as { user_id?: string }).user_id).filter(Boolean) as string[],
  );
  const emailById = new Map<string, string | null>();
  for (let pageNum = 1; pageNum <= 10 && emailById.size < wantedIds.size; pageNum += 1) {
    const { data: found, error: listError } = await admin.auth.admin.listUsers({
      page: pageNum,
      perPage: 1000,
    });
    // Best-effort: a lookup failure must not 500 the subscriber list, which is
    // the failure this whole change exists to remove. Emails come back null.
    if (listError) break;
    const users = found?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if (wantedIds.has(u.id)) emailById.set(u.id, u.email ?? null);
    }
  }

  const isSuperAdmin = auth.role === "super_admin";
  const data = (result.data ?? []).map((row) => {
    const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    // Email is folded in before masking so it goes through maskEmail() like
    // every other identifier, rather than leaking unmasked to non-super-admins.
    const masked = applyUserMasking(
      {
        ...(profile ?? {}),
        full_name: null as string | null,
        email: emailById.get((row as { user_id: string }).user_id) ?? null,
      },
      isSuperAdmin,
    );
    return {
      ...row,
      user_profiles: {
        user_id: masked.user_id,
        first_name: masked.first_name ?? null,
        last_name: masked.last_name ?? null,
        full_name: masked.full_name ?? null,
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
