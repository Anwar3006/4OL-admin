/**
 * /api/transactions/expenses
 * Gap Analysis Part AA: operational expenses & P&L — super admin only
 * (T-D5 decision: expenses, P&L and net profit never exposed beyond SA).
 *
 * GET  → transactions.expenses — monthly buckets + P&L totals
 * POST → transactions.expenses — add an expense line
 * PUT  → transactions.expenses — update an existing line (id required)
 *
 * The transactions.expenses permission key has no role grants, so only
 * super_admin (which bypasses the catalog) can pass the gate.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CATEGORIES = [
  "backend_servers",
  "database",
  "otp_sms",
  "api_costs",
  "domain_cdn",
  "marketing_ads",
  "taxes_levies",
  "other",
] as const;

const WRITE_SCHEMA = z.object({
  id: z.string().uuid().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be formatted as YYYY-MM"),
  category: z.enum(CATEGORIES),
  amount: z.number().nonnegative(),
  note: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("transactions.expenses");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";

  try {
    const admin = getSupabaseAdmin();
    let query = admin.from("operational_expenses").select("*").order("month", { ascending: false });
    if (month) query = query.eq("month", month);
    const { data, error } = await query.limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const total = rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
    return NextResponse.json({ ok: true, expenses: rows, total: Math.round(total * 100) / 100 });
  } catch {
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("transactions.expenses");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: z.infer<typeof WRITE_SCHEMA>;
  try {
    body = WRITE_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("operational_expenses")
      .insert({
        month: body.month,
        category: body.category,
        amount: body.amount,
        note: body.note ?? null,
        entered_by: auth.user.id,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, expense: data });
  } catch {
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiUser("transactions.expenses");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: z.infer<typeof WRITE_SCHEMA>;
  try {
    body = WRITE_SCHEMA.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Expense id is required for updates" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("operational_expenses")
      .update({
        month: body.month,
        category: body.category,
        amount: body.amount,
        note: body.note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, expense: data });
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}
