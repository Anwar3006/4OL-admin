/**
 * GET /api/jobs/cvs — digital CV registry (Gap Analysis Part K, K-D3).
 * Metadata-only listing of hcp_digital_cvs with owner names. The AES
 * encryption-at-rest vault and consent gates are deferred to the
 * platform-security epic; document payloads stay in the jsonb column.
 */

import { NextRequest, NextResponse } from "next/server";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { applyUserMasking } from "@/lib/masking";
import { auditAdminRead } from "@/lib/security-audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("jobs.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
  const employmentStatus = searchParams.get("employment_status");
  const openToOffers = searchParams.get("open_to_offers");

  const supabase = getAdminClient();
  let query = supabase
    .from("hcp_digital_cvs")
    .select(
      [
        "id",
        "user_id",
        "specialty",
        "qualification",
        "licence_body",
        "employment_status",
        "open_to_offers",
        "documents",
        "consent",
        "created_at",
        "updated_at",
        "user_profiles(first_name,last_name)",
      ].join(","),
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (employmentStatus && employmentStatus !== "all") {
    query = query.eq("employment_status", employmentStatus);
  }
  if (openToOffers === "yes") query = query.eq("open_to_offers", true);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isSuperAdmin = auth.role === SUPER_ADMIN_ROLE;
  const rows = (data ?? []) as unknown as Array<{
    user_profiles: { first_name: string | null; last_name: string | null } | null;
  }>;
  const cvs = rows.map((row) => ({
    ...row,
    user_profiles: row.user_profiles
      ? applyUserMasking(row.user_profiles, isSuperAdmin)
      : null,
  }));

  void auditAdminRead(auth.user.id, "admin/jobs/cvs", cvs.length);

  const total = count ?? data?.length ?? 0;
  return NextResponse.json({
    cvs,
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    },
  });
}
