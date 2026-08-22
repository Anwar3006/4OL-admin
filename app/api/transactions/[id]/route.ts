/**
 * /api/transactions/[id]
 * Gap Analysis Part AA: ledger row actions behind RBAC.
 *
 * PATCH → transactions.manage
 *   { action: "retry" }    — requeue a failed payment (status → pending)
 *   { action: "dispute" }  — mark the charge disputed
 *   { action: "cancel" }   — cancel the charge
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PATCH_SCHEMA = z.object({
  action: z.enum(["retry", "dispute", "cancel"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("transactions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  let body: z.infer<typeof PATCH_SCHEMA>;
  try {
    body = PATCH_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await admin
      .from("transactions")
      .select("id, status, attempts")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.action === "retry") {
      if (existing.status !== "failed") {
        return NextResponse.json({ error: "Only failed transactions can be retried" }, { status: 422 });
      }
      updates.status = "pending";
      updates.attempts = (existing.attempts ?? 0) + 1;
      updates.next_retry_at = null;
    } else if (body.action === "dispute") {
      updates.status = "disputed";
    } else {
      updates.status = "cancelled";
    }

    const { data: updated, error: updateError } = await admin
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: `transactions.${body.action}`,
      target_table: "transactions",
      new_data: { transaction_id: id, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true, transaction: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
