/**
 * /api/transactions
 * Gap Analysis Part AA: unified finance ledger list behind RBAC.
 *
 * GET → transactions.view — paginated ledger with segment (Business vs User),
 * category, status, date-range, high-value and search filters.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const CATEGORIES = [
  "subscription_fee",
  "service_fee",
  "product_sale",
  "marketing_fee",
  "refund",
  "payout",
];
const STATUSES = [
  "received",
  "processed",
  "pending",
  "failed",
  "refunded",
  "disputed",
  "cancelled",
];
const SEGMENTS = ["all", "user", "business"];

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("transactions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const search = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const segment = url.searchParams.get("segment") ?? "all";
  const failedOnly = url.searchParams.get("failedOnly") === "true";
  const pendingOnly = url.searchParams.get("pendingOnly") === "true";
  const highValue = url.searchParams.get("highValue") === "true";
  const payer = (url.searchParams.get("payer") ?? "").trim();
  const dateFrom = url.searchParams.get("from") ?? "";
  const dateTo = url.searchParams.get("to") ?? "";

  if (category && !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Invalid category filter: ${category}` }, { status: 400 });
  }
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }
  if (!SEGMENTS.includes(segment)) {
    return NextResponse.json({ error: `Invalid segment filter: ${segment}` }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    let query = admin.from("transactions").select("*", { count: "exact" });

    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,payer_name.ilike.%${search}%,payer_code.ilike.%${search}%`,
      );
    }
    if (category) query = query.eq("category", category);
    if (failedOnly) query = query.eq("status", "failed");
    else if (pendingOnly) query = query.eq("status", "pending");
    else if (status) query = query.eq("status", status);
    if (segment !== "all") query = query.eq("payer_class", segment);
    if (highValue) query = query.gte("amount", 500);
    if (payer) query = query.eq("payer_user_id", payer);
    if (dateFrom) query = query.gte("processed_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) query = query.lte("processed_at", `${dateTo}T23:59:59Z`);

    const from = (page - 1) * limit;
    const { data: rows, count, error } = await query
      .order("processed_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: rows ?? [], total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
