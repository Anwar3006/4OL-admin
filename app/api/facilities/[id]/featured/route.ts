/**
 * PUT|PATCH /api/facilities/[id]/featured — Featured placements lifecycle
 * (Gap Analysis Part H, H1/H4/H6, H-D3).
 *
 * PUT   { featured, feature_type?, feature_end? }
 *        featured=true  — set as featured (type defaults to 'admin',
 *                         feature_start stamped now).
 *        featured=false — remove from featured.
 * PATCH { paused }       — pause/unpause an active placement.
 *
 * Replaces the client-side adminToggleFacilityFeatured write so enforcement
 * happens on the server behind facilities.feature.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PUT_SCHEMA = z.object({
  featured: z.boolean(),
  feature_type: z.enum(["paid", "admin"]).optional(),
  feature_end: z.string().datetime().optional(),
});

const PATCH_SCHEMA = z.object({
  paused: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = parsed.data.featured
    ? {
        is_featured: true,
        feature_type: parsed.data.feature_type ?? "admin",
        feature_start: new Date().toISOString(),
        feature_end: parsed.data.feature_end ?? null,
        is_featured_paused: false,
      }
    : {
        is_featured: false,
        feature_type: null,
        feature_start: null,
        feature_end: null,
        is_featured_paused: false,
      };

  const { error } = await supabase
    .from("facility_profile")
    .update(update)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: parsed.data.featured ? "facility_featured_set" : "facility_featured_removed",
    p_target_table: "facility_profile",
    p_record_id: id,
    p_description: parsed.data.featured
      ? `Facility featured (${update.feature_type})`
      : "Facility removed from featured placements",
    p_severity: "info",
    p_old_data: null,
    p_new_data: update,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("facility_profile")
    .update({ is_featured_paused: parsed.data.paused })
    .eq("id", id)
    .eq("is_featured", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facility_featured_paused_toggled",
    p_target_table: "facility_profile",
    p_record_id: id,
    p_description: `Featured placement ${parsed.data.paused ? "paused" : "resumed"}`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { paused: parsed.data.paused },
  });

  return NextResponse.json({ ok: true });
}
