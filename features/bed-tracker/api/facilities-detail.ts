/**
 * PATCH /api/bedtracker/facilities/[id] — edit tracked-facility metadata
 * or toggle the tablet ping state (L-D4: the tablet app is out of scope;
 * the admin panel only records online state and last ping).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const SCHEMA = z.object({
  ghs_facility_code: z.string().max(50).nullish(),
  gps_coordinates: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'GPS must be "lat,lng"')
    .nullish(),
  facility_admin_name: z.string().max(120).nullish(),
  facility_admin_phone: z.string().max(30).nullish(),
  hardware_option: z.enum(["lease", "purchase", "byo"]).nullish(),
  subscription_tier: z.enum(["starter", "growth", "enterprise"]).nullish(),
  tablet_online: z.boolean().optional(),
  is_tracking_enabled: z.boolean().optional(),
  auto_alert_enabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("bedtracker.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
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

  const patch: Record<string, unknown> = { updated_by: auth.user.id };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }
  if (parsed.data.tablet_online !== undefined) {
    patch.last_ping_at = new Date().toISOString();
  }

  const admin = getAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("bed_tracker_facilities")
    .select(Object.keys(parsed.data).join(", ") || "id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) {
    return NextResponse.json({ error: "Tracked facility not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("bed_tracker_facilities")
    .update(patch)
    .eq("id", id)
    .select("id, tablet_online, is_tracking_enabled")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Tracked facility not found" }, { status: 404 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bedtracker_facility_update",
    p_target_table: "bed_tracker_facilities",
    p_record_id: id,
    p_description: "BedTracker facility metadata updated",
    p_severity: "info",
    p_old_data: existing,
    p_new_data: parsed.data,
  });

  return NextResponse.json({ ok: true, facility: updated });
}
