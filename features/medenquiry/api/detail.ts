/**
 * /api/medenquiry/[id]
 * Gap Analysis Part AB: enquiry detail + fulfilment actions behind RBAC.
 *
 * GET   → medenquiry.view   — single enquiry with embedded relations.
 * PATCH → medenquiry.manage — lifecycle actions:
 *   { action: "notify_user" }        — log a user notification (Pending tab)
 *   { action: "mark_pickup_ready" }  — matched → pickup_ready (+ gen code)
 *   { action: "confirm_delivery" }   — delivery_in_progress → completed
 *   { action: "cancel" }             — cancel the enquiry
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  action: z.enum(["notify_user", "mark_pickup_ready", "confirm_delivery", "cancel"]),
  note: z.string().max(500).optional(),
});

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("medenquiry.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("medication_enquiries")
      .select(
        `
        *,
        user:user_profiles!medication_enquiries_user_id_fkey(first_name, last_name, region),
        pharmacy:facility_profile!medication_enquiries_pharmacy_id_fkey(facility_name, area, region, contact_number),
        escrow:escrow_transactions!medication_enquiries_escrow_id_fkey(*),
        responses:enquiry_responses(*, facility:facility_profile(facility_name, area))
        `,
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    return NextResponse.json({ ok: true, enquiry: data });
  } catch {
    return NextResponse.json({ error: "Failed to load enquiry" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("medenquiry.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }

  let body: z.infer<typeof PATCH_SCHEMA>;
  try {
    body = PATCH_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("medication_enquiries")
      .select("id, status, fulfilment_mode, pickup_confirmation_code")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.action === "mark_pickup_ready") {
      if (!["matched", "in_escrow"].includes(existing.status)) {
        return NextResponse.json({ error: "Only matched/in-escrow enquiries can be marked pickup-ready" }, { status: 422 });
      }
      updates.status = "pickup_ready";
      if (!existing.pickup_confirmation_code) {
        updates.pickup_confirmation_code = String(Math.floor(100000 + Math.random() * 900000));
      }
    } else if (body.action === "confirm_delivery") {
      if (existing.status !== "delivery_in_progress") {
        return NextResponse.json({ error: "Only in-progress deliveries can be confirmed" }, { status: 422 });
      }
      updates.status = "completed";
      updates.delivery_status = "delivered";
      updates.actual_delivery = new Date().toISOString();
    } else if (body.action === "cancel") {
      if (["completed", "cancelled"].includes(existing.status)) {
        return NextResponse.json({ error: "Enquiry is already closed" }, { status: 422 });
      }
      updates.status = "cancelled";
    }
    // notify_user carries no row update — audit-only.

    let updated = existing;
    if (Object.keys(updates).length > 1) {
      const { data, error: updateError } = await admin
        .from("medication_enquiries")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      updated = data;
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: `medenquiry.${body.action}`,
      target_table: "medication_enquiries",
      new_data: { enquiry_id: id, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true, enquiry: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
  }
}
