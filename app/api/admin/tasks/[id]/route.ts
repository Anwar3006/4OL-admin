import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MoveTaskSchema = z.object({
  status: z.enum(["new", "in_progress", "under_review", "completed"]),
  boardPosition: z.number().int().min(0),
});

// Gap Analysis Part D — PATCH doubles as the full task editor. A payload
// carrying boardPosition is a column move (handled by the existing RPC);
// anything else is a field edit applied directly.
const EditTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    status: z.enum(["new", "in_progress", "under_review", "completed"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    category: z.string().trim().max(80).nullable(),
    assigneeId: z.uuid().nullable(),
    dueDate: z.string().trim().nullable(),
    progressPercent: z.number().int().min(0).max(100),
  })
  .partial();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("tasks.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const move = MoveTaskSchema.safeParse(body);
  if (move.success) {
    const admin = getSupabaseAdmin();
    const { error } = await admin.rpc("update_admin_task_status", {
      p_task_id: id,
      p_new_status: move.data.status,
      p_board_position: move.data.boardPosition,
      p_admin_id: user.id,
    });

    if (error) {
      console.error("[admin/tasks/:id PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to move task." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const edit = EditTaskSchema.safeParse(body);
  if (!edit.success || Object.keys(edit.data).length === 0) {
    return NextResponse.json(
      { error: "Invalid request", details: edit.success ? undefined : edit.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (edit.data.title !== undefined) updates.title = edit.data.title;
  if (edit.data.description !== undefined) updates.description = edit.data.description;
  if (edit.data.status !== undefined) updates.status = edit.data.status;
  if (edit.data.priority !== undefined) updates.priority = edit.data.priority;
  if (edit.data.category !== undefined) updates.category = edit.data.category;
  if (edit.data.assigneeId !== undefined) updates.assignee_id = edit.data.assigneeId;
  if (edit.data.dueDate !== undefined) updates.due_date = edit.data.dueDate;
  if (edit.data.progressPercent !== undefined) updates.progress_percent = edit.data.progressPercent;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_tasks")
    .update(updates)
    .eq("id", id)
    .select("id, title")
    .single();

  if (error) {
    console.error("[admin/tasks/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "update_task",
    p_target_table: "admin_tasks",
    p_record_id: id,
    p_description: `Updated task "${data.title}"`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("tasks.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const admin = getSupabaseAdmin();

  // Capture the title before removal for the audit log.
  const { data: existing } = await admin
    .from("admin_tasks")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await admin.from("admin_tasks").delete().eq("id", id);
  if (error) {
    console.error("[admin/tasks/:id DELETE] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "delete_task",
    p_target_table: "admin_tasks",
    p_record_id: id,
    p_description: `Deleted task "${existing?.title ?? id}"`,
  });

  return NextResponse.json({ success: true });
}
