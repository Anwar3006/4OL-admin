import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getRequestUser } from "@/lib/mobile-auth";

/**
 * GET /api/user/entitlement — the mobile app's single source of truth for
 * "is this user premium?" (FITNESS_MOCKUP_GAP_ANALYSIS.md, decision D6).
 *
 * Identity comes from the caller's own JWT: we build a token-scoped client
 * (same pattern as features/period/data/request-auth.ts) so `get_my_entitlement()`
 * resolves auth.uid() inside Postgres — there is NO user-id parameter to
 * spoof. Paystack wiring is deliberately absent: once payment collection is
 * enabled it only inserts rows into user_subscriptions (source='paystack'),
 * this endpoint needs no change.
 */

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the token's signature in-process before trusting it. The
  // token-scoped client below still carries the JWT so get_my_entitlement()
  // resolves auth.uid() inside Postgres under RLS — that part is unchanged.
  // What is gone is the extra auth.getUser() round trip that used to sit
  // between this check and the RPCs.
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );

  const [entitlementRes, tiersRes] = await Promise.all([
    supabase.rpc("get_my_entitlement"),
    supabase.rpc("get_subscription_tiers"),
  ]);

  if (entitlementRes.error) {
    return NextResponse.json({ error: entitlementRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    entitlement: entitlementRes.data ?? {
      is_premium: false,
      tier_key: "free",
      tier_name: "Free",
      is_lifetime: false,
      expires_at: null,
      source: null,
    },
    // Paywall tier list; tolerate the pre-migration state.
    tiers: tiersRes.error ? [] : tiersRes.data ?? [],
  });
}
