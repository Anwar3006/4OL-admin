/**
 * POST /api/facilityscout/submissions/[id]/assign — assign a scout
 * submission to a field collector (`m-scout-assign`). Gap Analysis Part N
 * (N.4 Phase 2, N-D7): sets collector, priority, SLA due date, and moves
 * the submission to field_review. Pass { ids: [...] } in the body for the
 * bulk-assign variant (path id ignored).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const ASSIGN_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50).optional(),
  collector_id: z.string().uuid().nullable(),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  admin_notes: z.string().max(2000).optional(),
});

// Mockup SLA windows: Normal 5-day / High 3-day / Urgent 24-hour.
const SLA_DAYS = { normal: 5, high: 3, urgent: 1 } as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilityscout.review");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ASSIGN_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const slaDueAt = new Date(
    Date.now() + SLA_DAYS[parsed.data.priority] * 24 * 60 * 60 * 1000,
  ).toISOString();

  const admin = getAdminClient();
  const { data: updated, error } = await admin
    .from("facility_scout_submissions")
    .update({
      assigned_collector_id: parsed.data.collector_id,
      priority: parsed.data.priority,
      sla_due_at: slaDueAt,
      admin_notes: parsed.data.admin_notes ?? null,
      // Unassigning returns the submission to the pending pool.
      status: parsed.data.collector_id ? "field_review" : "pending",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select("id, submission_ref");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facilityscout_submission_assigned",
    p_target_table: "facility_scout_submissions",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} scout submission(s) ${
      parsed.data.collector_id ? "assigned to collector" : "unassigned"
    } (${parsed.data.priority} priority)`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: {
      ids,
      collector_id: parsed.data.collector_id,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
