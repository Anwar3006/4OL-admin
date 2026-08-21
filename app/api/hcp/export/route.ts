/**
 * GET /api/hcp/export — CSV export of the HCP registry
 * (Gap Analysis Part J, header Export). Gated on hcp.view.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireAdminApiUser("hcp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hcp_verifications")
    .select(
      `
      license_number, license_type, issuing_body, license_expiry, specialty,
      profession_type, region, affiliated_facility_name, can_respond_enquiries,
      verification_status, verified_at, created_at,
      user_profiles!hcp_verifications_user_id_fkey(first_name, last_name, phone_number),
      facility_profile(facility_name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Name",
    "Profession",
    "Specialty",
    "Regulatory Body",
    "License No.",
    "License Expiry",
    "Facility",
    "Region",
    "Med Enquiries",
    "Status",
    "Verified At",
    "Created At",
  ];

  const lines = (data ?? []).map((row: any) =>
    [
      `${row.user_profiles?.first_name ?? ""} ${row.user_profiles?.last_name ?? ""}`.trim(),
      row.profession_type ?? row.license_type,
      row.specialty,
      row.issuing_body,
      row.license_number,
      row.license_expiry,
      row.facility_profile?.facility_name ?? row.affiliated_facility_name,
      row.region,
      row.can_respond_enquiries ? "Yes" : "No",
      row.verification_status,
      row.verified_at,
      row.created_at,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hcp-registry-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
