/**
 * /api/transactions/refunds
 * Gap Analysis Part AA: refund workflow collection.
 *
 * GET  → transactions.view   — refund queue with status filter
 * POST → transactions.manage — manual refund request (search a charge by
 *        reference and file a refund without leaving the tab)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const REASONS = [
  "accidental_purchase",
  "duplicate_charge",
  "service_not_received",
  "technical_error",
  "other",
] as const;

const POST_SCHEMA = z.object({
  reference: z.string().min(3).max(80),
  amount: z.number().positive().optional(),
  reason: z.enum(REASONS).default("other"),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("transactions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  if (status && !["pending_approval", "processed", "rejected"].includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    let query = admin
      .from("refunds")
      .select("*, transactions!inner(reference, payer_name, payer_code, amount, payment_method, status)")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, refunds: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load refunds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("transactions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: z.infer<typeof POST_SCHEMA>;
  try {
    body = POST_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: txn, error } = await admin
      .from("transactions")
      .select("id, amount, status")
      .ilike("reference", body.reference)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!txn) {
      return NextResponse.json({ error: `No transaction with reference ${body.reference}` }, { status: 404 });
    }
    if (txn.status === "refunded") {
      return NextResponse.json({ error: "Transaction is already refunded" }, { status: 409 });
    }

    const amount = body.amount ?? Number(txn.amount);
    if (amount > Number(txn.amount)) {
      return NextResponse.json({ error: "Refund amount exceeds the charge" }, { status: 422 });
    }

    const { data: refund, error: insertError } = await admin
      .from("refunds")
      .insert({
        transaction_id: txn.id,
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
    return NextResponse.json({ error: "Failed to file refund" }, { status: 500 });
  }
}
