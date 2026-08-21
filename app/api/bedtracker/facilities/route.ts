/**
 * POST /api/bedtracker/facilities — register a facility for bed tracking.
 * Gap Analysis Part L (m-bt-facility modal): resolves against an existing
 * facility_profile row (Phase 5 interconnection), seeds its tracked wards
 * from the selected ward types, and records hardware/subscription metadata
 * only (L-D7 — no billing integration).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const WARD_TYPES = [
  "general",
  "icu",
  "surgical",
  "medical",
  "maternity",
  "pediatric",
  "psychiatric",
  "geriatric",
] as const;

const SCHEMA = z.object({
  facility_id: z.string().uuid(),
  ghs_facility_code: z.string().max(50).optional(),
  gps_coordinates: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'GPS must be "lat,lng"')
    .optional(),
  facility_admin_name: z.string().max(120).optional(),
  facility_admin_phone: z.string().max(30).optional(),
  hardware_option: z.enum(["lease", "purchase", "byo"]).optional(),
  subscription_tier: z.enum(["starter", "growth", "enterprise"]).optional(),
  wards_to_track: z.array(z.enum(WARD_TYPES)).min(1).default(["general"]),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("bedtracker.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: existing, error: existingError } = await admin
    .from("bed_tracker_facilities")
    .select("id")
    .eq("facility_id", parsed.data.facility_id)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json(
      { error: "This facility is already tracked by BedTracker" },
      { status: 409 },
    );
  }

  const { data: created, error: createError } = await admin
    .from("bed_tracker_facilities")
    .insert({
      facility_id: parsed.data.facility_id,
      ghs_facility_code: parsed.data.ghs_facility_code ?? null,
      gps_coordinates: parsed.data.gps_coordinates ?? null,
      facility_admin_name: parsed.data.facility_admin_name ?? null,
      facility_admin_phone: parsed.data.facility_admin_phone ?? null,
      hardware_option: parsed.data.hardware_option ?? null,
      subscription_tier: parsed.data.subscription_tier ?? null,
      updated_by: auth.user.id,
    })
    .select("id")
    .single();
  if (createError || !created) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to register facility" },
      { status: 500 },
    );
  }

  const { error: wardsError } = await admin.from("bed_tracker_wards").insert(
    parsed.data.wards_to_track.map((wardType) => ({
      bed_tracker_facility_id: created.id,
      ward_type: wardType,
      update_source: "admin" as const,
      updated_by: auth.user.id,
    })),
  );
  if (wardsError) {
    return NextResponse.json(
      { error: `Facility registered but ward seeding failed: ${wardsError.message}` },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bedtracker_facility_registered",
    p_target_table: "bed_tracker_facilities",
    p_record_id: created.id,
    p_description: "Facility registered for BedTracker",
    p_severity: "info",
    p_old_data: null,
    p_new_data: { wards: parsed.data.wards_to_track },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
