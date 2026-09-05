/**
 * PATCH /api/bedtracker/wards/[id] — update a ward's bed counts.
 * Gap Analysis Part L (L7): writes a bed_tracker_ward_updates audit row
 * (L6) and, when a ward hits zero available beds on an auto-alert
 * facility, raises a bed_tracker_alerts row that the notifications
 * cascade picks up.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const SCHEMA = z.object({
  total_beds: z.number().int().min(0).max(10000).optional(),
  occupied_beds: z.number().int().min(0).max(10000).optional(),
  update_source: z.enum(["tablet", "admin", "api"]).default("admin"),
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
  if (parsed.data.total_beds === undefined && parsed.data.occupied_beds === undefined) {
    return NextResponse.json(
      { error: "Provide total_beds and/or occupied_beds" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: ward, error: fetchError } = await admin
    .from("bed_tracker_wards")
    .select("*, bed_tracker_facilities(id, facility_id, auto_alert_enabled)")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!ward) return NextResponse.json({ error: "Ward not found" }, { status: 404 });

  const newTotal = parsed.data.total_beds ?? ward.total_beds;
  const newOccupied = Math.min(
    parsed.data.occupied_beds ?? ward.occupied_beds,
    newTotal,
  );

  // Audit trail first (L6) — the counts about to change.
  const { error: historyError } = await admin
    .from("bed_tracker_ward_updates")
    .insert({
      ward_id: id,
      previous_total: ward.total_beds,
      previous_occupied: ward.occupied_beds,
      new_total: newTotal,
      new_occupied: newOccupied,
      actor: auth.user.id,
      source: parsed.data.update_source,
    });
  if (historyError) {
    console.error("[bedtracker/wards] history insert failed:", historyError.message);
  }

  const { data: updated, error: updateError } = await admin
    .from("bed_tracker_wards")
    .update({
      total_beds: newTotal,
      occupied_beds: newOccupied,
      updated_by: auth.user.id,
      update_source: parsed.data.update_source,
    })
    .eq("id", id)
    .select("id, ward_type, total_beds, occupied_beds, available_beds")
    .maybeSingle();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Zero-capacity alert cascade (mockup: "Korle Bu ICU: 0 beds").
  let alertRaised = false;
  const facility = ward.bed_tracker_facilities as any;
  if (facility?.auto_alert_enabled && Number(updated?.available_beds) === 0 && newTotal > 0) {
    const { error: alertError } = await admin.from("bed_tracker_alerts").insert({
      facility_id: facility.id,
      alert_type: "capacity_full",
      severity: "critical",
      message: `${String(ward.ward_type).replaceAll("_", " ")} ward has 0 available beds`,
      bed_type: ward.ward_type,
      beds_available: 0,
      beds_total: newTotal,
    });
    alertRaised = !alertError;
    if (alertError) {
      console.error("[bedtracker/wards] alert insert failed:", alertError.message);
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bedtracker_ward_update",
    p_target_table: "bed_tracker_wards",
    p_record_id: id,
    p_description: `Ward beds updated (${ward.ward_type})`,
    p_severity: "info",
    p_old_data: { total_beds: ward.total_beds, occupied_beds: ward.occupied_beds },
    p_new_data: { total_beds: newTotal, occupied_beds: newOccupied },
  });

  return NextResponse.json({ ok: true, ward: updated, alertRaised });
}
