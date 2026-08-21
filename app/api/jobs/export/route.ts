/**
 * GET /api/jobs/export — CSV export of job postings (Gap Analysis Part K).
 * Gated on jobs.view (no dedicated jobs.export key in the RBAC catalog).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const HEADERS = [
  "Title",
  "Facility",
  "Job Type",
  "Specialty",
  "Region",
  "Status",
  "Salary Min",
  "Salary Max",
  "Applications",
  "Views",
  "Featured",
  "Published At",
  "Expires At",
  "Created At",
];

export async function GET() {
  const auth = await requireAdminApiUser("jobs.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("job_postings")
    .select(
      "title, job_type, specialty, region, status, salary_min, salary_max, application_count, view_count, is_featured, published_at, expires_at, created_at, facility_profile(facility_name)",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((posting) => {
    const facility = posting.facility_profile as { facility_name?: string } | null;
    return [
      posting.title,
      facility?.facility_name ?? "",
      posting.job_type,
      posting.specialty,
      posting.region,
      posting.status,
      posting.salary_min,
      posting.salary_max,
      posting.application_count,
      posting.view_count,
      posting.is_featured ? "yes" : "no",
      posting.published_at,
      posting.expires_at,
      posting.created_at,
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [HEADERS.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-postings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
