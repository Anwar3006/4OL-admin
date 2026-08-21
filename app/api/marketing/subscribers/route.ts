/**
 * GET /api/marketing/subscribers — user_subscriptions joined to the plan
 * catalog and masked user profiles (K5 pattern via lib/masking).
 * Gap Analysis Part M (M8/M9). Filters: status, plan, at-risk view.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { applyUserMasking } from "@/lib/masking";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STATUSES = ["active", "at_risk", "cancelled", "expired"];

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const status = url.searchParams.get("status") ?? "";
  const planId = url.searchParams.get("plan") ?? "";

  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_subscriptions")
    .select(
      "id, user_id, plan_id, status, subscribed_at, next_renewal_at, payment_method, auto_renew, risk_reason, last_reminded_at, cancelled_at, marketing_subscriptions!inner(id, name, price, billing_cycle), user_profiles(user_id, first_name, last_name, email, phone_number)",
      { count: "exact" },
    );
  if (status) query = query.eq("status", status);
  if (planId) query = query.eq("plan_id", planId);

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
