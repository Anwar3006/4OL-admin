import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A registry export deliberately includes all entities, not just facilities. */
export async function GET() {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { data, error } = await getAdminClient()
    .from("providers")
    .select("name, kind, provider_type, region, district, area, contact_number, email, status, verification_status, accepts_nhis, is_top_rated, is_featured, rating_average, rating_count, view_count, subscription_tier, created_at, provider_types!inner(label, listing_entity, directory_category)")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["Provider", "Kind", "Type", "Listing entity", "Directory category", "Region", "District", "Area", "Contact", "Email", "Status", "Verification", "NHIS", "Top rated", "Featured", "Rating", "Reviews", "Views", "Plan", "Created at"];
  const rows = (data ?? []).map((row: any) => {
    const type = Array.isArray(row.provider_types) ? row.provider_types[0] : row.provider_types;
    return [row.name, row.kind, type?.label ?? row.provider_type, type?.listing_entity, type?.directory_category ?? "Unlisted / B2B", row.region, row.district, row.area, row.contact_number, row.email, row.status, row.verification_status, row.accepts_nhis ? "Yes" : "No", row.is_top_rated ? "Yes" : "No", row.is_featured ? "Yes" : "No", row.rating_average, row.rating_count, row.view_count, row.subscription_tier ?? "free", row.created_at].map(csvCell).join(",");
  });

  return new NextResponse([header.map(csvCell).join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="providers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
