import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/db/admin";

/**
 * POST /api/user/redeem-promo — promo-code redemption from the mobile paywall
 * (Marketing mockup parity build, Phase 4).
 *
 * Flow: JWT identifies the user (token-scoped client, no user-id parameter to
 * spoof) → service-role client validates the code against marketing_discounts
 * and grants a user_subscriptions row with source='promo' → an audit trail
 * lands in discount_redemptions and current_uses is incremented.
 *
 * Only free_trial / partner codes grant plan access directly; percentage /
 * fixed / bogo codes are payment discounts and require checkout (Paystack),
 * which is not wired yet — they get a clear 422 rather than a free plan.
 * Degrades gracefully (503) while the unification migration is unapplied.
 */

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

const GRANTABLE_TYPES = new Set(["free_trial", "partner"]);

export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdminClient();
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  let body: { code?: string; tierId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
  }

  // ---------------------------------------------------------------- code lookup
  const { data: discount, error: discountError } = await supabaseAdmin
    .from("marketing_discounts")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (discountError) {
    return NextResponse.json(
      { error: "Promo redemption is not available yet. Please try again later." },
      { status: 503 },
    );
  }
  if (!discount) {
    return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const isActive =
    discount.is_active !== false &&
    discount.status === "active" &&
    (!discount.valid_from || discount.valid_from <= nowIso) &&
    (!discount.valid_until || discount.valid_until >= nowIso);
  if (!isActive) {
    return NextResponse.json({ error: "This promo code has expired" }, { status: 410 });
  }

  if (discount.max_uses != null && Number(discount.current_uses ?? 0) >= Number(discount.max_uses)) {
    return NextResponse.json({ error: "This promo code has reached its usage limit" }, { status: 410 });
  }

  if (!GRANTABLE_TYPES.has(discount.discount_type)) {
    return NextResponse.json(
      {
        error:
          "This code gives a payment discount and will be applied at checkout. Only trial and partner codes can be redeemed here.",
      },
      { status: 422 },
    );
  }

  // --------------------------------------------------- per-user eligibility gate
  const { count: priorRedemptions, error: redemptionCountError } = await supabaseAdmin
    .from("discount_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("discount_id", discount.id)
    .eq("user_id", userId);
  if (redemptionCountError) {
    return NextResponse.json(
      { error: "Promo redemption is not available yet. Please try again later." },
      { status: 503 },
    );
  }
  const perUserLimit = discount.per_user_limit != null ? Number(discount.per_user_limit) : 1;
  if ((priorRedemptions ?? 0) >= perUserLimit) {
    return NextResponse.json({ error: "You have already used this promo code" }, { status: 409 });
  }

  // ------------------------------------------------------------ tier resolution
  const requestedTier = (body.tierId ?? "pro").trim();
  let tierQuery = supabaseAdmin.from("subscription_tiers").select("*");
  tierQuery = /^[0-9a-f-]{36}$/i.test(requestedTier)
    ? tierQuery.eq("id", requestedTier)
    : tierQuery.eq("key", requestedTier.toLowerCase());
  const { data: tier, error: tierError } = await tierQuery.maybeSingle();

  if (tierError || !tier || tier.key === "free") {
    return NextResponse.json({ error: "Selected plan is not available" }, { status: 422 });
  }

  const eligiblePlans: string[] = Array.isArray(discount.eligible_plans) ? discount.eligible_plans : [];
  if (eligiblePlans.length > 0 && !eligiblePlans.includes(tier.key) && !eligiblePlans.includes(tier.id)) {
    return NextResponse.json({ error: "This code is not valid for the selected plan" }, { status: 422 });
  }

  // ------------------------------------------------------- eligible_users gate
  const eligibleUsers = discount.eligible_users ?? "all";
  if (eligibleUsers !== "all") {
    const { data: existingSubs } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id, tier_id, status")
      .eq("user_id", userId);
    const rows = existingSubs ?? [];

    if (eligibleUsers === "new" && rows.length > 0) {
      return NextResponse.json({ error: "This code is only available to new subscribers" }, { status: 403 });
    }
    if (eligibleUsers === "free_plan") {
      const hasPaidActive = rows.some((r: { status: string; tier_id: string | null }) => r.status === "active" && r.tier_id);
      if (hasPaidActive) {
        return NextResponse.json({ error: "This code is only available to free-plan users" }, { status: 403 });
      }
    }
    if (eligibleUsers === "nhis_linked") {
      // Best-effort profile check; tolerate deployments missing the column.
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("nhis_number")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile?.nhis_number) {
        return NextResponse.json(
          { error: "This code requires a linked NHIS number on your profile" },
          { status: 403 },
        );
      }
    }
  }

  // -------------------------------------------------------------- grant the plan
  const durationDays = tier.duration_days != null ? Number(tier.duration_days) : null;
  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
    : null;

  // Supersede any existing active subscription so the one-active-per-user
  // partial unique index can never abort the redemption.
  await supabaseAdmin
    .from("user_subscriptions")
    .update({ status: "expired", updated_at: nowIso })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: subscription, error: insertError } = await supabaseAdmin
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      tier_id: tier.id,
      status: "active",
      source: "promo",
      starts_at: nowIso,
      expires_at: expiresAt,
      payment_method: "promo",
      auto_renew: false,
      note: `Promo code ${discount.code}`,
    })
    .select("id, expires_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Could not activate your plan. Please try again." },
      { status: 500 },
    );
  }

  // Audit trail + usage counter. Failures here must not roll back the grant
  // the user just received — log and continue.
  try {
    await supabaseAdmin.from("discount_redemptions").insert({
      discount_id: discount.id,
      user_id: userId,
      subscription_id: subscription.id,
    });
    const { error: rpcError } = await supabaseAdmin.rpc("increment_discount_uses", {
      p_discount_id: discount.id,
    });
    if (rpcError) throw rpcError;
  } catch {
    // Fallback when the RPC helper is absent: direct counter bump.
    try {
      await supabaseAdmin
        .from("marketing_discounts")
        .update({ current_uses: Number(discount.current_uses ?? 0) + 1, updated_at: nowIso })
        .eq("id", discount.id);
    } catch {
      /* counter drift is reconcilable; the grant stands */
    }
  }

  return NextResponse.json({
    ok: true,
    message: `${tier.name} activated`,
    tier: { id: tier.id, key: tier.key, name: tier.name },
    subscription_id: subscription.id,
    expires_at: expiresAt,
  });
}
