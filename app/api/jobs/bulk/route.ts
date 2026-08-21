/**
 * POST /api/jobs/bulk — bulk lifecycle actions on job postings
 * (Gap Analysis Part K). Body: { ids: string[], action: "close" | "repost" }.
 * close: any non-closed posting → closed. repost: closed/expired/filled →
 * pending_review (re-enters the approval queue).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BULK_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["close", "repost"]),
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

  const parsed = BULK_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { ids, action } = parsed.data;
  const now = new Date().toISOString();
  const update: Record<string, unknown> =
    action === "close"
      ? { status: "closed", updated_at: now }
      : { status: "pending_review", posting_rejection_reason: null, updated_at: now };

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("job_postings")
    .update(update)
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: `job_postings_bulk_${action}`,
    p_target_table: "job_postings",
    p_record_id: null,
    p_description: `Bulk ${action}: ${updated?.length ?? 0} of ${ids.length} job postings updated`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { ids, action },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
