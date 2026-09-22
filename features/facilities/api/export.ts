import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("providers")
    .select(
      `
      name, provider_type, region, district, area, contact_number,
      email, status, accepts_nhis,
      is_top_rated, top_rated_rank, is_featured, feature_type,
      rating_average, rating_count, view_count, subscription_tier, created_at,
      provider_credentials (number, credential_type, status)
      `,
    )
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Facility",
    "Type",
    "Region",
    "District",
    "Area",
    "Contact",
    "Email",
    "Status",
    "HEFRA No.",
    "NHIS",
    "Top Rated",
    "Top Rated Rank",
    "Featured",
    "Feature Type",
    "Rating",
    "Reviews",
    "Views",
    "Plan",
    "Created At",
  ];

  const lines = (data ?? []).map((row: any) => {
    const hefraCredentials = (row.provider_credentials || []).filter(
      (c: any) => c.credential_type === "hefra_facility_licence"
    );
    const hefraCredential =
      hefraCredentials.find((c: any) => c.status === "verified") ?? hefraCredentials[0];

    return [
      row.name,
      row.provider_type,
      row.region,
      row.district,
      row.area,
      row.contact_number,
      row.email,
      row.status,
      hefraCredential?.number || "",
      row.accepts_nhis ? "Yes" : "No",
      row.is_top_rated ? "Yes" : "No",
      row.top_rated_rank ?? "",
      row.is_featured ? "Yes" : "No",
      row.feature_type ?? "",
      row.rating_average ?? "",
      row.rating_count ?? 0,
      row.view_count ?? 0,
      row.subscription_tier ?? "free",
      row.created_at,
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="facilities-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
