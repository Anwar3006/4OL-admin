/**
 * GET /api/admin/delete-account-requests/export — CSV of the full request
 * log (Gap Analysis Part Z, Z-D5; deleteaccount.export). Phones masked
 * even in exports; emails retained because the export itself is a
 * compliance artifact behind an export permission.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { maskPhone } from "@/lib/masking";

function csvEscape(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const auth = await requireAdminApiUser("deleteaccount.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("delete_account_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("[admin/delete-account-requests/export] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to export deletion requests." }, { status: 500 });
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  let profiles: Record<string, { first_name: string | null; last_name: string | null; phone_number: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await admin
      .from("user_profiles")
      .select("user_id,first_name,last_name,phone_number")
      .in("user_id", userIds);
    for (const p of profileRows ?? []) profiles[p.user_id] = p;
  }

  const headers = [
    "Request ID", "User ID", "User Name", "Email", "Phone (masked)", "Status",
    "Reason", "Created At", "Reviewed At", "Grace Started At",
    "Processed At", "Data Export Requested",
  ];
  const csvRows = rows.map((r) => {
    const p = profiles[r.user_id];
    const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";
    return [
      r.id, r.user_id, name, r.email, maskPhone(p?.phone_number), r.status,
      r.reason, r.created_at, r.reviewed_at, r.grace_period_started_at,
      r.processed_at, r.data_export_requested_at,
    ]
      .map(csvEscape)
      .join(",");
  });
  const csv = [headers.join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="delete-account-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
