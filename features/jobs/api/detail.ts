/**
 * PATCH /api/jobs/[id] — job posting lifecycle edits (Gap Analysis Part K).
 * Supports field edits plus explicit lifecycle actions:
 *   close (published → closed), repost (expired/closed → pending_review),
 *   feature (is_featured + featured_until window).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const EDIT_SCHEMA = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  requirements: z.array(z.string()).optional(),
  job_type: z
    .enum([
      "full_time",
      "part_time",
      "contract",
      "temporary",
      "internship",
      "locum",
      "volunteer",
    ])
    .optional(),
  specialty: z.string().nullish(),
  experience_level: z.string().nullish(),
  minimum_qualification: z.string().nullish(),
  min_experience_years: z.number().int().nullish(),
  required_licence: z.string().nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  location: z.string().nullish(),
  region: z.string().nullish(),
  distance_radius_km: z.number().int().nullish(),
  target_demographics: z.array(z.string()).optional(),
  expires_at: z.string().datetime().nullish(),
  action: z.enum(["close", "repost", "feature", "unfeature"]).optional(),
  featured_until: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("jobs.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EDIT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const passthrough = [
    "title",
    "description",
    "requirements",
    "job_type",
    "specialty",
    "experience_level",
    "minimum_qualification",
    "min_experience_years",
    "required_licence",
    "salary_min",
    "salary_max",
    "location",
    "region",
    "distance_radius_km",
    "target_demographics",
    "expires_at",
  ] as const;
  for (const key of passthrough) {
    const value = parsed.data[key];
    if (value !== undefined) update[key] = value;
  }

  if (parsed.data.action === "close") update.status = "closed";
  if (parsed.data.action === "repost") {
    update.status = "pending_review";
    update.posting_rejection_reason = null;
  }
  if (parsed.data.action === "feature") {
    update.is_featured = true;
    update.featured_until = parsed.data.featured_until ?? null;
  }
  if (parsed.data.action === "unfeature") {
    update.is_featured = false;
    update.featured_until = null;
  }

  const supabase = getAdminClient();
  const { data: updated, error } = await supabase
    .from("job_postings")
    .update(update)
    .eq("id", id)
    .select("id, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: parsed.data.action
      ? `job_posting_${parsed.data.action}`
      : "job_posting_edited",
    p_target_table: "job_postings",
    p_record_id: id,
    p_description: parsed.data.action
      ? `Job posting ${parsed.data.action} action applied`
      : "Job posting edited",
    p_severity: "info",
    p_old_data: null,
    p_new_data: update,
  });

  return NextResponse.json({ ok: true, status: updated[0]?.status });
}
