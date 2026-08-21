/**
 * GET /api/admin/delete-account-requests — server-filtered request list.
 * Gap Analysis Part Z (Z-D2): replaces three tabs rendering the same
 * unfiltered component. Phones are server-masked; emails shown only to
 * holders of deleteaccount.view (already enforced here).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isRbacMigrationMissing } from "@/lib/permissions";
import { maskPhone } from "@/lib/masking";

const STATUSES = new Set([
  "pending_review",
  "in_verification",
  "grace_period",
  "completed",
  "cancelled",
]);

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("deleteaccount.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  if (status !== "all" && !STATUSES.has(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  let query = admin
    .from("delete_account_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (status !== "all") query = query.eq("status", status);

  const { data: rows, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
  let profiles: Record<string, { first_name: string | null; last_name: string | null; phone_number: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await admin
      .from("user_profiles")
      .select("user_id,first_name,last_name,phone_number")
      .in("user_id", userIds);
    for (const p of profileRows ?? []) profiles[p.user_id] = p;
  }

  // Per-status counts for the tab labels (Epic 21 RPC with safe fallback).
  let stats: Record<string, number> | null = null;
  const { data: statsData, error: statsError } = await admin.rpc("get_delete_account_request_stats");
  if (!statsError && statsData) {
    stats = statsData as Record<string, number>;
  } else if (statsError && !isRbacMigrationMissing(statsError)) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: list.map((r) => {
      const p = profiles[r.user_id];
      return {
        ...r,
        user_name: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown" : "Unknown",
        phone_masked: maskPhone(p?.phone_number),
      };
    }),
    count: count ?? list.length,
    page,
    limit,
    stats,
  });
}

/**
 * POST — manual entry (mockup "+ Manual Entry"): records a deletion request
 * an admin received out-of-band (support call, letter). Requires an existing
 * user account because delete_account_requests.user_id is NOT NULL.
 */
const MANUAL_SCHEMA = z.object({
  email: z.string().email(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("deleteaccount.approve");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = MANUAL_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  // user_profiles has no email column — resolve the account via auth.users.
  // The installed auth-js (2.105.3) only supports page/perPage on listUsers
  // (no server-side `filters` param), so we scan pages client-side.
  const wanted = parsed.data.email.toLowerCase();
  let target: { id: string; email?: string } | undefined;
  for (let pageNum = 1; pageNum <= 10 && !target; pageNum += 1) {
    const { data: found, error: listError } = await admin.auth.admin.listUsers({
      page: pageNum,
      perPage: 1000,
    });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 502 });
    }
    const users = found?.users ?? [];
    if (users.length === 0) break;
    target = users.find((u) => u.email?.toLowerCase() === wanted);
  }

  if (!target) {
    return NextResponse.json(
      { error: "No account found with that email — manual entry requires an existing user." },
      { status: 404 },
    );
  }

  const { data, error } = await admin
    .from("delete_account_requests")
    .insert({
      user_id: target.id,
      email: target.email ?? parsed.data.email,
      reason: parsed.data.reason ? `[Manual entry] ${parsed.data.reason}` : "[Manual entry]",
      status: "pending_review",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "delete_request_manual_entry",
    p_target_table: "delete_account_requests",
    p_record_id: data.id,
    p_description: `Manually recorded deletion request for ${parsed.data.email}`,
    p_severity: "warning",
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
