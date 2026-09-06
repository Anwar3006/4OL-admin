/**
 * GET /api/jobs/applicants — applicant pipeline (Gap Analysis Part K, K6).
 * Lists job_applications with applicant profile + posting embeds and merges
 * licence badge data from hcp_verifications (no direct FK, so fetched in a
 * second query and merged server-side).
 * Privacy: names are returned raw; the UI masks them (K-D7 "Ama K****").
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const APPLICATION_SELECT =
  "id, job_id, applicant_id, cover_letter, resume_url, portfolio_url, status, review_notes, reviewed_at, created_at, applicant_type, profession, specialization, highest_qualification, is_boosted, user_profiles!job_applications_applicant_id_fkey(first_name,last_name), job_postings(title, region, facility_profile(facility_name))";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("jobs.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
  const jobId = searchParams.get("job_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const supabase = getAdminClient();
  let query = supabase
    .from("job_applications")
    .select(APPLICATION_SELECT, { count: "exact" })
    // CV Boost (Part AM, AM-D7): boosted applications surface first.
    .order("is_boosted", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (jobId) query = query.eq("job_id", jobId);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let applications = data ?? [];
  if (search) {
    const needle = search.toLowerCase();
    applications = applications.filter((app) => {
      const profile = app.user_profiles as
        | { first_name?: string; last_name?: string }
        | null;
      const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.toLowerCase();
      return name.includes(needle);
    });
  }

  // Licence badge merge: hcp_verifications has no FK to job_applications.
  const applicantIds = [
    ...new Set(applications.map((app) => app.applicant_id as string)),
  ];
  const licenceByApplicant = new Map<string, { licence_number: string; issuing_body: string | null; verification_status: string }>();
  if (applicantIds.length) {
    const { data: licences } = await supabase
      .from("hcp_verifications")
      .select("user_id, license_number, issuing_body, specialty, verification_status")
      .in("user_id", applicantIds);
    for (const row of licences ?? []) {
      licenceByApplicant.set(row.user_id as string, {
        licence_number: (row.license_number ?? "") as string,
        issuing_body: row.issuing_body as string | null,
        verification_status: row.verification_status as string,
      });
    }
  }

  const enriched = applications.map((app) => ({
    ...app,
    licence: licenceByApplicant.get(app.applicant_id as string) ?? null,
  }));

  const total = count ?? enriched.length;
  return NextResponse.json({
    applications: enriched,
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    },
  });
}
