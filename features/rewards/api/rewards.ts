import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export const REWARD_DOMAINS = [
  "general",
  "trivia",
  "fitness",
  "fitcoins",
  "facility_scout",
] as const;

const REWARD_TYPES = [
  "cash",
  "points",
  "badge",
  "discount",
  "prize",
  "airtime",
  "data",
  "fitcoins",
  "subscription",
  "physical",
  "other",
] as const;

const FULFILLMENT_METHODS = [
  "automatic",
  "manual",
  "code",
  "digital",
  "physical",
] as const;

const RewardInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().min(1).max(16).default("🎁"),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  rewardType: z.enum(REWARD_TYPES),
  value: z.string().trim().max(200).nullable().optional(),
  amount: z.number().min(0).max(999999999999).nullable().optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional(),
  domains: z.array(z.enum(REWARD_DOMAINS)).min(1),
  fulfillmentMethod: z.enum(FULFILLMENT_METHODS),
  inventoryCount: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

const RewardUpdateSchema = RewardInputSchema.partial().extend({
  id: z.string().uuid(),
});

const toDbPayload = (input: Partial<z.infer<typeof RewardInputSchema>>) => {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl || null;
  if (input.rewardType !== undefined) payload.reward_type = input.rewardType;
  if (input.value !== undefined) payload.value = input.value || null;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.currency !== undefined) payload.currency = input.currency || null;
  if (input.domains !== undefined) payload.domains = input.domains;
  if (input.fulfillmentMethod !== undefined)
    payload.fulfillment_method = input.fulfillmentMethod;
  if (input.inventoryCount !== undefined) payload.inventory_count = input.inventoryCount;
  if (input.isActive !== undefined) payload.is_active = input.isActive;
  return payload;
};

export async function GET() {
  const auth = await requireAdminApiUser("rewards.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [catalog, triviaEvents, challenges, fitcoinItems, scoutConfig, grants] =
    await Promise.all([
      admin.from("reward_catalog").select("*").order("created_at", { ascending: false }),
      admin
        .from("period_trivia_events")
        .select("id,title,status,starts_at,ends_at,reward_id")
        .order("starts_at", { ascending: false })
        .limit(100),
      admin
        .from("fitness_challenges")
        .select("id,title,status,start_date,end_date,reward_id,reward_description,reward_image_url")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("fitcoin_rewards")
        .select("id,name,description,cost,is_active,catalog_reward_id")
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("facility_scout_config").select("*").limit(1).maybeSingle(),
      admin
        .from("reward_grants")
        .select("id,reward_id,user_id,source_domain,source_type,status,awarded_at,fulfilled_at")
        .order("awarded_at", { ascending: false })
        .limit(100),
    ]);

  const firstError = [catalog, triviaEvents, challenges, fitcoinItems, scoutConfig, grants]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    rewards: catalog.data ?? [],
    triviaEvents: triviaEvents.data ?? [],
    fitnessChallenges: challenges.data ?? [],
    fitcoinItems: fitcoinItems.data ?? [],
    facilityScoutConfig: scoutConfig.data ?? null,
    grants: grants.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("rewards.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = RewardInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reward", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("reward_catalog")
    .insert({ ...toDbPayload(parsed.data), created_by: auth.user.id })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Reward creation failed" }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "create_reward",
    p_target_table: "reward_catalog",
    p_record_id: data.id,
    p_description: `Created reusable reward "${data.name}"`,
  });

  return NextResponse.json({ reward: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("rewards.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = RewardUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reward update", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...input } = parsed.data;
  const payload = toDbPayload(input);
  if (Object.keys(payload).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("reward_catalog")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Reward update failed" }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "update_reward",
    p_target_table: "reward_catalog",
    p_record_id: id,
    p_description: `Updated reusable reward "${data.name}"`,
  });

  return NextResponse.json({ reward: data });
}
