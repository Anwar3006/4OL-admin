/**
 * /api/transactions/[id]/refund
 * Gap Analysis Part AA: refund request from a ledger row (mockup parity).
 *
 * POST → transactions.manage — creates a refunds row in pending_approval.
 * Full approval happens in /api/transactions/refunds/[id] (super admin).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { formatCurrency } from "@/lib/format";

const REASONS = [
  "accidental_purchase",
  "duplicate_charge",
  "service_not_received",
  "technical_error",
  "other",
] as const;

const REFUND_SCHEMA = z.object({
  amount: z.number().positive().optional(),
  reason: z.enum(REASONS).default("other"),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("transactions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  let body: z.infer<typeof REFUND_SCHEMA>;
  try {
    body = REFUND_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: txn, error: fetchError } = await admin
      .from("transactions")
      .select("id, amount, status, direction")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    if (txn.status === "refunded") {
      return NextResponse.json({ error: "Transaction is already refunded" }, { status: 409 });
    }

    const amount = body.amount ?? Number(txn.amount);
    if (amount > Number(txn.amount)) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed the charge of ${formatCurrency(txn.amount)}` },
        { status: 422 },
      );
    }

    const { data: existingPending } = await admin
      .from("refunds")
      .select("id")
      .eq("transaction_id", id)
      .eq("status", "pending_approval")
      .maybeSingle();
    if (existingPending) {
      return NextResponse.json({ error: "A refund is already awaiting approval" }, { status: 409 });
    }

    const { data: refund, error: insertError } = await admin
      .from("refunds")
      .insert({
        transaction_id: id,
        amount,
        reason: body.reason,
        notes: body.notes ?? null,
        requested_by: auth.user.id,
      })
      .select("*")
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true, refund });
  } catch {
    return NextResponse.json({ error: "Failed to request refund" }, { status: 500 });
  }
}
