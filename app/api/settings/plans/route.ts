import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("subscription_tiers")
    .select(
      "id, key, name, description, price_ghs, duration_days, benefits, is_active, display_order",
    )
    .order("display_order", { ascending: true })
    .order("price_ghs", { ascending: true });

  if (error) {
    console.error("[settings/plans] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load subscription plans." },
      { status: 500 },
    );
  }

  return NextResponse.json({ plans: data ?? [] });
}

// Price/duration/active-state editing only — key, name and benefits stay
// fixed here to keep this a pricing control, not a plan-authoring tool.
const PlanUpdateSchema = z.object({
  id: z.uuid(),
  price_ghs: z.coerce.number().min(0).max(100000),
  duration_days: z.coerce.number().int().min(1).max(3650).nullable(),
  is_active: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.billing");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = PlanUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan update", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: previous } = await admin
    .from("subscription_tiers")
    .select("id, key, price_ghs, duration_days, is_active")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!previous) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("subscription_tiers")
    .update({
      price_ghs: parsed.data.price_ghs,
      duration_days: parsed.data.duration_days,
      is_active: parsed.data.is_active,
    })
    .eq("id", parsed.data.id)
    .select(
      "id, key, name, description, price_ghs, duration_days, benefits, is_active, display_order",
    )
    .single();

  if (error) {
    console.error("[settings/plans] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update plan." },
      { status: 500 },
    );
  }

  await logSettingsChange(admin, user.id, "billing", `plan:${previous.key}`, previous, {
    price_ghs: parsed.data.price_ghs,
    duration_days: parsed.data.duration_days,
    is_active: parsed.data.is_active,
  });

  return NextResponse.json({ plan: data });
}
