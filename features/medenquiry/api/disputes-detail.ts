/**
 * /api/medenquiry/disputes/[id]
 * Gap Analysis Part AB: dispute resolution — SUPER ADMIN ONLY (M-D4,
 * refund-approval precedent). Verdict releases funds to the pharmacy or
 * refunds the user, records the resolution on the escrow row and writes
 * the matching Part AA ledger entry.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getAdminClient } from "@/lib/db/admin";

const PATCH_SCHEMA = z.object({
  verdict: z.enum(["release_to_pharmacy", "refund_user"]),
  resolution_notes: z.string().max(1000).optional(),
});

const UUID_RE = /^[0-9a-f-]{36}$/i;
const DEFAULT_FEE_PCT = 4.5;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("medenquiry.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Only the super admin can resolve escrow disputes" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid escrow id" }, { status: 400 });
  }

  let body: z.infer<typeof PATCH_SCHEMA>;
  try {
    body = PATCH_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data: escrow, error: fetchError } = await admin
      .from("escrow_transactions")
      .select("id, enquiry_id, amount, currency, status, payment_provider")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!escrow) return NextResponse.json({ error: "Disputed escrow not found" }, { status: 404 });
    if (escrow.status !== "disputed") {
      return NextResponse.json({ error: `Escrow is not in dispute (status: ${escrow.status})` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const verdict = body.verdict;
    const releaseToPharmacy = verdict === "release_to_pharmacy";

    const { error: escrowError } = await admin
      .from("escrow_transactions")
      .update({
        status: releaseToPharmacy ? "resolved" : "refunded",
        released_to: releaseToPharmacy ? "seller" : "buyer",
        released_at: releaseToPharmacy ? now : null,
        refunded_at: releaseToPharmacy ? null : now,
        dispute_resolved_at: now,
        dispute_resolved_by: auth.user.id,
        dispute_resolution: verdict,
      })
      .eq("id", id);
    if (escrowError) return NextResponse.json({ error: escrowError.message }, { status: 500 });

    // Sync the enquiry status + resolve payer identity for the ledger row.
    let payerName = "User";
    let payerUserId: string | null = null;
    if (escrow.enquiry_id) {
      const { data: enquiry } = await admin
        .from("medication_enquiries")
        .select(
          `user_id,
           user:user_profiles!medication_enquiries_user_id_fkey(first_name, last_name)`,
        )
        .eq("id", escrow.enquiry_id)
        .maybeSingle();
      if (enquiry) {
        payerUserId = enquiry.user_id;
        const userEmbed = enquiry.user as unknown as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
        const u = Array.isArray(userEmbed) ? userEmbed[0] : userEmbed;
        payerName = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim() || "User";
      }
      await admin
        .from("medication_enquiries")
        .update({
          status: releaseToPharmacy ? "completed" : "cancelled",
          updated_at: now,
        })
        .eq("id", escrow.enquiry_id);
    }

    const amount = Number(escrow.amount);
    let feePct = DEFAULT_FEE_PCT;
    if (releaseToPharmacy) {
      const { data: rateRow } = await admin
        .from("service_charge_rates")
        .select("rate_pct")
        .eq("key", "med_enquiry")
        .maybeSingle();
      if (rateRow?.rate_pct != null) feePct = Number(rateRow.rate_pct);
    }

    const { error: ledgerError } = await admin.from("transactions").insert({
      category: releaseToPharmacy ? "product_sale" : "refund",
      direction: releaseToPharmacy ? "in" : "out",
      amount,
      currency: escrow.currency ?? "GHS",
      payment_method: escrow.payment_provider ?? "escrow",
      status: "processed",
      payer_class: "user",
      payer_user_id: payerUserId,
      payer_name: payerName,
      payer_code: `user#${payerName.slice(0, 12)}`,
      entity_kind: "consumer",
      txn_type_detail: releaseToPharmacy ? "med_enquiry_dispute_release" : "med_enquiry_dispute_refund",
      source: "escrow",
      source_id: escrow.id,
      fee_rate_applied: releaseToPharmacy ? feePct : null,
      fee_amount: releaseToPharmacy ? Number(((amount * feePct) / 100).toFixed(2)) : null,
      created_by: auth.user.id,
    });
    if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "medenquiry.dispute_resolved",
      target_table: "escrow_transactions",
      new_data: { escrow_id: id, verdict, notes: body.resolution_notes ?? null, amount },
    });

    return NextResponse.json({ ok: true, verdict, amount });
  } catch {
    return NextResponse.json({ error: "Failed to resolve dispute" }, { status: 500 });
  }
}
