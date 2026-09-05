import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Anatomy premium-layer configuration (Gap Analysis Part AM, P2–P5).
 *
 * GET  — current layer gating + per-region premium flags (anatomy.view)
 * PUT  — upsert layers + region flags (anatomy.edit)
 *
 * Mobile reads the same state through the get_anatomy_premium_config() RPC
 * (migration 20260824_anatomy_premium_am). Turning a layer OFF makes it
 * free for everyone; ON gates it behind 4OurLife Premium.
 */

const DEFAULT_LAYERS = { organs: true, tours: true, quiz: true };
const LAYER_KEYS = Object.keys(DEFAULT_LAYERS) as (keyof typeof DEFAULT_LAYERS)[];

export async function GET() {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [configRes, regionsRes] = await Promise.all([
    admin.from("anatomy_premium_config").select("layers").eq("id", "global").maybeSingle(),
    admin
      .from("anatomy_regions")
      .select("key, label, is_premium")
      .order("display_order"),
  ]);

  if (configRes.error || regionsRes.error) {
    // Migration not applied yet — fail open with defaults.
    return NextResponse.json({
      layers: DEFAULT_LAYERS,
      regions: [],
      applied: false,
    });
  }

  return NextResponse.json({
    layers: { ...DEFAULT_LAYERS, ...(configRes.data?.layers ?? {}) },
    regions: regionsRes.data ?? [],
    applied: true,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const layers: Record<string, boolean> = { ...DEFAULT_LAYERS };
  for (const key of LAYER_KEYS) {
    if (typeof body?.layers?.[key] === "boolean") layers[key] = body.layers[key];
  }

  const premiumRegions: string[] = Array.isArray(body?.premium_regions)
    ? body.premium_regions.filter((r: unknown) => typeof r === "string").slice(0, 50)
    : [];

  const admin = getAdminClient();

  const { error: upsertError } = await admin.from("anatomy_premium_config").upsert(
    { id: "global", layers, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (upsertError) {
    return NextResponse.json(
      { error: `Migration 20260824_anatomy_premium_am not applied? ${upsertError.message}` },
      { status: 500 },
    );
  }

  // Region flags: clear all, then set the selected ones (cheap — 14 rows).
  const { error: clearError } = await admin
    .from("anatomy_regions")
    .update({ is_premium: false })
    .eq("is_premium", true);
  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }
  if (premiumRegions.length) {
    const { error: setError } = await admin
      .from("anatomy_regions")
      .update({ is_premium: true })
      .in("key", premiumRegions);
    if (setError) {
      return NextResponse.json({ error: setError.message }, { status: 500 });
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "anatomy_premium_config_update",
    p_target_table: "anatomy_premium_config",
    p_record_id: "global",
    p_description: `Anatomy premium layers updated (${Object.entries(layers)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none"}; ${premiumRegions.length} premium region(s))`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { layers, premium_regions: premiumRegions },
  });

  return NextResponse.json({ ok: true, layers, premium_regions: premiumRegions });
}
