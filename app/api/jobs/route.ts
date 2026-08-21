/**
 * GET|POST /api/jobs — job postings management (Gap Analysis Part K).
 *
 * GET: guarded list with filters (search, job_type, status, region,
 * specialty) + pagination + metrics, backward-compatible keys.
 * POST: post a job (K4/K-D6) — submissions go to 'draft' or
 * 'pending_review'; publication requires the /review approve step.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const JOB_SELECT =
  "id, facility_id, title, description, requirements, job_type, specialty, experience_level, salary_min, salary_max, salary_currency, location, region, status, minimum_qualification, min_experience_years, required_licence, distance_radius_km, target_demographics, is_featured, featured_until, approved_by, approved_at, posting_rejection_reason, published_at, expires_at, view_count, application_count, created_at, facility_profile(facility_name, facility_type, area, region)";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("jobs.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const search = searchParams.get("search")?.trim();
  const jobType = searchParams.get("job_type");
  const status = searchParams.get("status");
  const region = searchParams.get("region");
  const specialty = searchParams.get("specialty");

  const supabase = getSupabaseAdmin();
  const query = supabase
    .from("job_postings")
    .select(JOB_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) query.ilike("title", `%${search}%`);
  if (jobType) query.eq("job_type", jobType);
  if (status) query.eq("status", status);
  if (region) query.ilike("region", region);
  if (specialty) query.ilike("specialty", `%${specialty}%`);

  const from = (page - 1) * limit;
  const { data: postings, count, error } = await query.range(from, from + limit - 1);
  if (error) {
    console.error("[jobs] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load Jobs data." }, { status: 500 });
  }

  const [applicationsResult, pendingResult] = await Promise.all([
    supabase
      .from("job_applications")
      .select("id, status", { count: "exact", head: true }),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  return NextResponse.json({
    postings: postings ?? [],
    meta: {
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
      currentPage: page,
    },
    metrics: {
      listings: count ?? 0,
      applicants: applicationsResult.count ?? 0,
      pendingReview: pendingResult.count ?? 0,
      pendingApplications: 0,
    },
  });
}

const POST_SCHEMA = z.object({
  facility_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  job_type: z.enum([
    "full_time",
    "part_time",
    "contract",
    "temporary",
    "internship",
    "locum",
    "volunteer",
  ]),
  specialty: z.string().optional(),
  experience_level: z.string().optional(),
  minimum_qualification: z.string().optional(),
  min_experience_years: z.number().int().optional(),
  required_licence: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  location: z.string().optional(),
  region: z.string().optional(),
  distance_radius_km: z.number().int().optional(),
  target_demographics: z.array(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
  submit_for_review: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("jobs.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("job_postings")
    .insert({
      facility_id: parsed.data.facility_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      requirements: parsed.data.requirements ?? [],
      job_type: parsed.data.job_type,
      specialty: parsed.data.specialty ?? null,
      experience_level: parsed.data.experience_level ?? null,
      minimum_qualification: parsed.data.minimum_qualification ?? null,
      min_experience_years: parsed.data.min_experience_years ?? null,
      required_licence: parsed.data.required_licence ?? null,
      salary_min: parsed.data.salary_min ?? null,
      salary_max: parsed.data.salary_max ?? null,
      location: parsed.data.location ?? null,
      region: parsed.data.region ?? null,
      distance_radius_km: parsed.data.distance_radius_km ?? null,
      target_demographics: parsed.data.target_demographics ?? [],
      expires_at: parsed.data.expires_at ?? null,
      status: parsed.data.submit_for_review ? "pending_review" : "draft",
      created_by: auth.user.id,
    })
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "job_posting_created",
    p_target_table: "job_postings",
    p_record_id: inserted?.id ?? null,
    p_description: `Job posting "${parsed.data.title}" created as ${inserted?.status}`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { title: parsed.data.title, status: inserted?.status },
  });

  return NextResponse.json({ ok: true, id: inserted?.id, status: inserted?.status });
}
