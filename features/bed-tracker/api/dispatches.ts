/**
 * POST /api/bedtracker/dispatches — emergency dispatch (m-bt-emergency).
 * Gap Analysis Part L (L7): creates an ambulance_dispatches row, flips the
 * dispatched unit to en_route, and records whether the deterministic
 * routing suggestion was used (ai_routing_used — mockup language, no ML).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const SCHEMA = z.object({
  ambulance_id: z.string().uuid(),
  emergency_type: z.string().min(2).max(60),
  pickup_address: z.string().min(2).max(250),
  pickup_gps: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'GPS must be "lat,lng"')
    .optional(),
  pickup_region: z.string().max(60).optional(),
  pickup_area: z.string().max(120).optional(),
  destination_facility_id: z.string().uuid(),
  required_ward: z.string().max(40).optional(),
  patient_gender: z.enum(["female", "male", "other"]).optional(),
  patient_age_group: z.string().max(30).optional(),
  caller_name: z.string().max(120).optional(),
  caller_phone: z.string().max(30).optional(),
  priority: z.enum(["normal", "urgent", "critical"]).default("urgent"),
  eta_minutes: z.number().int().min(0).max(720).optional(),
  notes: z.string().max(1000).optional(),
  ai_routing_used: z.boolean().default(false),
  rerouted_from_facility_id: z.string().uuid().optional(),
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

  const admin = getAdminClient();
  const dispatchReference = `DSP-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data: created, error: createError } = await admin
    .from("ambulance_dispatches")
    .insert({
      dispatch_reference: dispatchReference,
      emergency_type: parsed.data.emergency_type,
      pickup_address: parsed.data.pickup_address,
      pickup_gps: parsed.data.pickup_gps ?? null,
      pickup_region: parsed.data.pickup_region ?? null,
      pickup_area: parsed.data.pickup_area ?? null,
      destination_facility_id: parsed.data.destination_facility_id,
      ambulance_id: parsed.data.ambulance_id,
      required_ward: parsed.data.required_ward ?? null,
      patient_gender: parsed.data.patient_gender ?? null,
      patient_age_group: parsed.data.patient_age_group ?? null,
      caller_name: parsed.data.caller_name ?? null,
      caller_phone: parsed.data.caller_phone ?? null,
      priority: parsed.data.priority,
      eta_minutes: parsed.data.eta_minutes ?? null,
      notes: parsed.data.notes ?? null,
      status: "assigned",
      dispatcher_id: auth.user.id,
      ai_routing_used: parsed.data.ai_routing_used,
      rerouted_from_facility_id: parsed.data.rerouted_from_facility_id ?? null,
    })
    .select("id, dispatch_reference, status")
    .single();

  if (createError || !created) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create dispatch" },
      { status: 500 },
    );
  }

  const { error: fleetError } = await admin
    .from("ambulances")
    .update({ status: "en_route", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.ambulance_id);
  if (fleetError) {
    console.error("[bedtracker/dispatches] fleet update failed:", fleetError.message);
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bedtracker_dispatch_created",
    p_target_table: "ambulance_dispatches",
    p_record_id: created.id,
    p_description: `Emergency dispatch ${created.dispatch_reference}`,
    p_severity: "warning",
    p_old_data: null,
    p_new_data: {
      emergency_type: parsed.data.emergency_type,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ ok: true, dispatch: created }, { status: 201 });
}
