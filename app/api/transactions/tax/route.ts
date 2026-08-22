/**
 * /api/transactions/tax
 * Gap Analysis Part AA: GRA tax & VAT surface.
 *
 * GET   → transactions.view  — computed liability (17.5% consumption taxes on
 *         subscription revenue, 25% income tax on service fees), filing
 *         schedule and platform TIN. Figures are computed from the ledger
 *         (T-D4 decision); filings themselves are manual records.
 * PATCH → super_admin only — mark a quarterly filing filed/remit.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const FILING_SCHEMA = z.object({
  filing_id: z.string().uuid(),
  status: z.enum(["filed", "in_progress", "not_started"]),
  remitted_amount: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("transactions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getSupabaseAdmin();
    const [filings, tin, overview] = await Promise.all([
      admin.from("tax_filings").select("*").order("due_date", { ascending: true }),
      admin.from("finance_config").select("value").eq("key", "gra_tin").maybeSingle(),
      admin.rpc("get_transactions_overview"),
    ]);
    if (filings.error) return NextResponse.json({ error: filings.error.message }, { status: 500 });

    const tax = overview.data && !overview.error ? (overview.data as { tax?: unknown }).tax ?? null : null;
    
    // Metric-visibility gate: non-SA roles only see the liability if allowed.
    if (auth.role !== SUPER_ADMIN_ROLE) {
      const { data: vis } = await admin
        .from("finance_visibility_config")
        .select("visible_to_finance")
        .eq("metric_key", "tax_liability")
        .maybeSingle();
      if (vis && vis.visible_to_finance === false) {
        return NextResponse.json({
          ok: true,
          tin: tin.data?.value ?? "\u2014",
          filings: filings.data ?? [],
          summary: null,
          summary_hidden: true,
        });
      }
    }
    
    return NextResponse.json({
      ok: true,
      tin: tin.data?.value ?? "\u2014",
      filings: filings.data ?? [],
      summary: tax,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load tax data" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser("transactions.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json({ error: "Only a super admin can remit tax filings" }, { status: 403 });
  }

  let body: z.infer<typeof FILING_SCHEMA>;
  try {
    body = FILING_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const updates: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };
    if (body.remitted_amount !== undefined) updates.remitted_amount = body.remitted_amount;
    if (body.notes) updates.notes = body.notes;
    if (body.status === "filed") updates.filed_at = new Date().toISOString();

    const { data, error } = await admin
      .from("tax_filings")
      .update(updates)
      .eq("id", body.filing_id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "transactions.tax_filing_updated",
      target_table: "tax_filings",
      new_data: { filing_id: body.filing_id, status: body.status },
    });

    return NextResponse.json({ ok: true, filing: data });
  } catch {
    return NextResponse.json({ error: "Failed to update filing" }, { status: 500 });
  }
}
