import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * FitCoins reward-system management (FITNESS_MOCKUP_GAP_ANALYSIS.md, D8).
 *
 *   GET   /api/fitness/fitcoins                     — overview: tiers + rewards + recent redemptions
 *   GET   /api/fitness/fitcoins?resource=ledger     — fitness ledger page (app_ledger category=fitness)
 *   GET   /api/fitness/fitcoins?resource=redemptions — redemptions page
 *   PATCH /api/fitness/fitcoins                     — update an activity tier (coins/cap/purpose/active)
 *   POST  /api/fitness/fitcoins                     — create a redemption-catalog reward
 *   PUT   /api/fitness/fitcoins                     — update/toggle a redemption-catalog reward
 *
 * Issuance authority is NOT exposed here: coins are only minted by the
 * session-completion trigger / award_fitcoins (service_role). This route
 * changes AMOUNTS (fitcoin_activity_tiers) and the redemption catalog —
 * the trigger reads tier amounts at award time.
 */

const ACTIVITY_KEYS = [
  "workout_complete", "outdoor_event_complete", "streak_bonus",
  "challenge_reward", "plan_day_complete", "manual_activity",
] as const;

const TierUpdateSchema = z.object({
  activityKey: z.enum(ACTIVITY_KEYS),
  coins: z.number().int().min(0).max(100000).optional(),
  dailyCap: z.number().int().min(1).max(1000).nullable().optional(),
  purpose: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

const RewardCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  cost: z.number().int().min(1).max(1000000),
  isActive: z.boolean().optional(),
});

const RewardUpdateSchema = RewardCreateSchema.partial().extend({
  rewardId: z.string().uuid(),
});

async function listTiers() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitcoin_activity_tiers")
    .select("*")
    .order("coins", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listRewards() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitcoin_rewards")
    .select("*")
    .order("cost", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listRedemptions(limit: number, offset: number) {
  const admin = getSupabaseAdmin();
  const { data, error, count } = await admin
    .from("fitcoin_rewards_redemption")
    .select("id, user_id, reward_id, cost_at_redemption, redeemed_at, fitcoin_rewards(name)", { count: "exact" })
    .order("redeemed_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const profiles = userIds.length
    ? (await admin.from("user_profiles").select("user_id, first_name, last_name").in("user_id", userIds)).data ?? []
    : [];
  const nameOf = new Map(profiles.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`]));

  return {
    rows: (data ?? []).map((r) => ({ ...r, user_name: nameOf.get(r.user_id) ?? r.user_id })),
    total: count ?? 0,
  };
}

async function listLedger(limit: number, offset: number, userId?: string | null) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("app_ledger")
    .select("id, user_id, amount, transaction_type, reference_id, created_at", { count: "exact" })
    .eq("category", "fitness")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (userId) query = query.eq("user_id", userId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const profiles = userIds.length
    ? (await admin.from("user_profiles").select("user_id, first_name, last_name").in("user_id", userIds)).data ?? []
    : [];
  const nameOf = new Map(profiles.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`]));

  return {
    rows: (data ?? []).map((r) => ({ ...r, user_name: nameOf.get(r.user_id) ?? r.user_id })),
    total: count ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("fitcoins.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") ?? "overview";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30) || 30, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  try {
    if (resource === "ledger") {
      return NextResponse.json(await listLedger(limit, offset, url.searchParams.get("userId")));
    }
    if (resource === "redemptions") {
      return NextResponse.json(await listRedemptions(limit, offset));
    }
    if (resource === "tiers") {
      return NextResponse.json({ tiers: await listTiers() });
    }
    if (resource === "rewards") {
      return NextResponse.json({ rewards: await listRewards() });
    }

    const [tiers, rewards, redemptions] = await Promise.all([
      listTiers(),
      listRewards(),
      listRedemptions(10, 0),
    ]);
    return NextResponse.json({ tiers, rewards, redemptions });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("fitcoins.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = TierUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.coins !== undefined) patch.coins = parsed.data.coins;
  if (parsed.data.dailyCap !== undefined) patch.daily_cap = parsed.data.dailyCap;
  if (parsed.data.purpose !== undefined) patch.purpose = parsed.data.purpose;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitcoin_activity_tiers")
    .update(patch)
    .eq("activity_key", parsed.data.activityKey)
    .select("activity_key, coins, daily_cap, is_active")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Tier not found" }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "update_fitcoin_tier",
    p_target_table: "fitcoin_activity_tiers",
    p_record_id: parsed.data.activityKey,
    p_description: `Updated FitCoins tier ${parsed.data.activityKey}: ${JSON.stringify(patch)}`,
  });

  return NextResponse.json({ success: true, tier: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("fitcoins.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = RewardCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitcoin_rewards")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      cost: parsed.data.cost,
      is_active: parsed.data.isActive ?? true,
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "create_fitcoin_reward",
    p_target_table: "fitcoin_rewards",
    p_record_id: data.id,
    p_description: `Created FitCoins reward "${parsed.data.name}" (${parsed.data.cost} coins)`,
  });

  return NextResponse.json({ success: true, rewardId: data.id });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("fitcoins.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = RewardUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.cost !== undefined) patch.cost = parsed.data.cost;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("fitcoin_rewards")
    .update(patch)
    .eq("id", parsed.data.rewardId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "update_fitcoin_reward",
    p_target_table: "fitcoin_rewards",
    p_record_id: parsed.data.rewardId,
    p_description: `Updated FitCoins reward ${parsed.data.rewardId}: ${JSON.stringify(patch)}`,
  });

  return NextResponse.json({ success: true });
}
