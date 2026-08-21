import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// FitCoins incentive formula config (m-route-incentives, Gap Analysis Part F
// phase 5). Single-row table seeded by 20260820_map_footprint_extension.sql.
export async function GET() {
  const auth = await requireAdminApiUser("fitness.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitness_outdoor_incentives")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    incentives: data ?? {
      base_fitcoins: 50,
      per_km_fitcoins: 10,
      verification_bonus: 25,
      event_bonus: 20,
      notes: null,
    },
  });
}

const UpdateIncentivesSchema = z.object({
  baseFitcoins: z.number().int().min(0).max(100000),
  perKmFitcoins: z.number().int().min(0).max(100000),
  verificationBonus: z.number().int().min(0).max(100000),
  eventBonus: z.number().int().min(0).max(100000),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("fitness.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = UpdateIncentivesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("fitness_outdoor_incentives").upsert(
    {
      id: true,
      base_fitcoins: parsed.data.baseFitcoins,
      per_km_fitcoins: parsed.data.perKmFitcoins,
      verification_bonus: parsed.data.verificationBonus,
      event_bonus: parsed.data.eventBonus,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "update_outdoor_incentives",
    p_target_table: "fitness_outdoor_incentives",
    p_record_id: "singleton",
    p_description: `Updated FitCoins incentive formula (base ${parsed.data.baseFitcoins}, per-km ${parsed.data.perKmFitcoins}, verify bonus ${parsed.data.verificationBonus}, event bonus ${parsed.data.eventBonus})`,
  });

  return NextResponse.json({ success: true });
}
