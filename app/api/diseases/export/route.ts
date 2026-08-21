/**
 * GET /api/diseases/export — CSV export of the conditions registry
 * (Gap Analysis Part I, I7/I8 bulk Export). Returns text/csv; the client
 * triggers a download from the response.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireAdminApiUser("diseases.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("conditions")
    .select(
      `
      name, icd11_code, severity, nhis_coverage, status, view_count,
      like_count, save_count, is_featured, featured_order, created_at,
      condition_categories (categories (name))
      `,
    )
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Name",
    "ICD-11",
    "Severity",
    "NHIS Coverage",
    "Categories",
    "Status",
    "Views",
    "Likes",
    "Saves",
    "Featured",
    "Carousel Slot",
    "Created At",
  ];

  const lines = (data ?? []).map((row: any) =>
    [
      row.name,
      row.icd11_code,
      row.severity,
      row.nhis_coverage,
      row.condition_categories
        ?.map((c: any) => c.categories?.name)
        .filter(Boolean)
        .join("; ") ?? "",
      row.status,
      row.view_count ?? 0,
      row.like_count ?? 0,
      row.save_count ?? 0,
      row.is_featured ? "Yes" : "No",
      row.featured_order ?? "",
      row.created_at,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conditions-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
