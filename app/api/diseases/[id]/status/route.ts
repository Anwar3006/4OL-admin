/**
 * PATCH /api/diseases/[id]/status — publish/review workflow
 * (Gap Analysis Part I, I10 / I-D7). Moves a condition between
 * draft / pending_review / published / archived and stamps
 * reviewed_by / reviewed_at when an editor publishes it.
 * Bulk variant: send { ids: [...], status } — path id is ignored.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STATUS_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("diseases.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = STATUS_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const admin = getSupabaseAdmin();

  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "published") {
    update.reviewed_by = auth.user.id;
    update.reviewed_at = new Date().toISOString();
  }

  const { data: updated, error } = await admin
    .from("conditions")
    .update(update)
    .in("id", ids)
    .select("id, name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "condition_status_changed",
    p_target_table: "conditions",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} condition(s) moved to ${parsed.data.status}`,
    p_severity: parsed.data.status === "published" ? "info" : "warning",
    p_old_data: null,
    p_new_data: { ids, status: parsed.data.status },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
