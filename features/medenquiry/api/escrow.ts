/**
 * /api/medenquiry/[id]/escrow
 * Gap Analysis Part AB: escrow release / refund behind transactions.manage
 * (finance_admin + SA — M-D3). Writes flow into the Part AA unified ledger:
 * release → product_sale (+ med_enquiry platform fee at the seeded rate);
 * refund  → outgoing refund row.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  action: z.enum(["release", "refund"]),
  reason: z.string().max(500).optional(),
});

const UUID_RE = /^[0-9a-f-]{36}$/i;
const DEFAULT_FEE_PCT = 4.5;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("transactions.manage");
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
    const { data: enquiry, error: fetchError } = await admin
      .from("medication_enquiries")
      .select(
        `id, status, medication_name, user_id, escrow_id, fulfilment_mode,
         user:user_profiles!medication_enquiries_user_id_fkey(first_name, last_name),
         pharmacy:facility_profile!medication_enquiries_pharmacy_id_fkey(facility_name),
         escrow:escrow_transactions!medication_enquiries_escrow_id_fkey(id, amount, currency, status, payment_provider)`,
      )
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    const escrow = Array.isArray(enquiry.escrow) ? enquiry.escrow[0] : enquiry.escrow;
    if (!escrow) return NextResponse.json({ error: "No escrow payment attached to this enquiry" }, { status: 422 });
    if (!["held", "disputed"].includes(escrow.status)) {
      return NextResponse.json({ error: `Escrow is already ${escrow.status}` }, { status: 409 });
    }

    const userEmbed = enquiry.user as { first_name?: string; last_name?: string } | null;
    const payerName = `${userEmbed?.first_name ?? ""} ${userEmbed?.last_name ?? ""}`.trim() || "User";
    const amount = Number(escrow.amount);
    const now = new Date().toISOString();

    // Resolve the platform fee rate (Part AA service_charge_rates), guarded.
    let feePct = DEFAULT_FEE_PCT;
    const { data: rateRow } = await admin
      .from("service_charge_rates")
      .select("rate_pct")
      .eq("key", "med_enquiry")
      .maybeSingle();
    if (rateRow?.rate_pct != null) feePct = Number(rateRow.rate_pct);

    if (body.action === "release") {
      const { error: escrowError } = await admin
        .from("escrow_transactions")
        .update({ status: "released", released_at: now, released_to: "seller" })
        .eq("id", escrow.id);
      if (escrowError) return NextResponse.json({ error: escrowError.message }, { status: 500 });

      const enquiryUpdates: Record<string, unknown> = { status: "completed", updated_at: now };
      if (enquiry.fulfilment_mode === "delivery") enquiryUpdates.delivery_status = "delivered";
      await admin.from("medication_enquiries").update(enquiryUpdates).eq("id", id);

      const { error: ledgerError } = await admin.from("transactions").insert({
        category: "product_sale",
        direction: "in",
        amount,
        currency: escrow.currency ?? "GHS",
        payment_method: escrow.payment_provider ?? "escrow",
        status: "processed",
        payer_class: "user",
        payer_user_id: enquiry.user_id,
        payer_name: payerName,
        payer_code: `user#${String(payerName).slice(0, 12)}`,
        entity_kind: "consumer",
        txn_type_detail: "med_enquiry_order",
        source: "escrow",
        source_id: escrow.id,
        fee_rate_applied: feePct,
        fee_amount: Number(((amount * feePct) / 100).toFixed(2)),
        created_by: auth.user.id,
      });
      if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    } else {
      const { error: escrowError } = await admin
        .from("escrow_transactions")
        .update({ status: "refunded", refunded_at: now, released_to: "buyer" })
        .eq("id", escrow.id);
      if (escrowError) return NextResponse.json({ error: escrowError.message }, { status: 500 });

      await admin
        .from("medication_enquiries")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", id);

      const { error: ledgerError } = await admin.from("transactions").insert({
        category: "refund",
        direction: "out",
        amount,
        currency: escrow.currency ?? "GHS",
        payment_method: escrow.payment_provider ?? "escrow",
        status: "processed",
        payer_class: "user",
        payer_user_id: enquiry.user_id,
        payer_name: payerName,
        payer_code: `user#${String(payerName).slice(0, 12)}`,
        entity_kind: "consumer",
        txn_type_detail: "med_enquiry_refund",
        source: "escrow",
        source_id: escrow.id,
        created_by: auth.user.id,
      });
      if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: `medenquiry.escrow_${body.action}`,
      target_table: "escrow_transactions",
      new_data: { enquiry_id: id, escrow_id: escrow.id, amount, reason: body.reason ?? null },
    });

    return NextResponse.json({ ok: true, action: body.action, amount });
  } catch {
    return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 });
  }
}
