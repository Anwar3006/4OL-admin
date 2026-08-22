/**
 * /api/transactions/refunds/[id]
 * Gap Analysis Part AA: refund approval workflow.
 *
 * PATCH → transactions.manage + super_admin only for approvals.
 *   { decision: "approve" } — marks the refund processed, flips the charge
 *       to refunded and writes an outgoing refund row to the ledger.
 *   { decision: "reject" }  — closes the refund request.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DECISION_SCHEMA = z.object({
  decision: z.enum(["approve", "reject"]),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("transactions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid refund id" }, { status: 400 });
  }

  let body: z.infer<typeof DECISION_SCHEMA>;
  try {
    body = DECISION_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: refund, error: fetchError } = await admin
      .from("refunds")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    if (refund.status !== "pending_approval") {
      return NextResponse.json({ error: "Refund has already been decided" }, { status: 409 });
    }

    const now = new Date().toISOString();

    if (body.decision === "reject") {
      const { error } = await admin
        .from("refunds")
        .update({ status: "rejected", processed_by: auth.user.id, processed_at: now })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    // Approve: super admin gate — money moves.
    if (auth.role !== SUPER_ADMIN_ROLE) {
      return NextResponse.json(
        { error: "Only a super admin can approve refunds" },
        { status: 403 },
      );
    }

    const { data: txn } = await admin
      .from("transactions")
      .select("id, reference, payer_user_id, payer_business_id, payer_name, payer_code, payer_class, entity_kind, payment_method")
      .eq("id", refund.transaction_id)
      .maybeSingle();

    const { error: updateError } = await admin
      .from("refunds")
      .update({ status: "processed", processed_by: auth.user.id, processed_at: now })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (txn) {
      await admin.from("transactions").update({ status: "refunded", updated_at: now }).eq("id", txn.id);
      await admin.from("transactions").insert({
        reference: `REFUND-${refund.id.toString().slice(0, 8).toUpperCase()}`,
        category: "refund",
        direction: "out",
        amount: refund.amount,
        currency: "GHS",
        payment_method: txn.payment_method ?? "manual",
        status: "processed",
        payer_class: txn.payer_class ?? "user",
        payer_user_id: txn.payer_user_id ?? null,
        payer_business_id: txn.payer_business_id ?? null,
        payer_name: txn.payer_name ?? "",
        payer_code: txn.payer_code ?? "",
        entity_kind: txn.entity_kind ?? "consumer",
        source: "manual",
        source_id: refund.transaction_id,
        created_by: auth.user.id,
      });
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "transactions.refund_approved",
      target_table: "refunds",
      new_data: { refund_id: id, amount: refund.amount, notes: body.notes ?? null },
    });

    return NextResponse.json({ ok: true, status: "processed" });
  } catch {
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
