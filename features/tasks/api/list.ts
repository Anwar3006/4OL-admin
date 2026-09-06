import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["new", "in_progress", "under_review", "completed"]).default("new"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  category: z.string().trim().max(80).optional(),
  assigneeId: z.uuid().optional().nullable(),
  dueDate: z.string().trim().optional().nullable(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("tasks.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("admin_tasks")
    .select("id, title, description, status, priority, category, assignee_id, due_date, board_position, task_seq, progress_percent, completed_at, created_at")
    .order("status", { ascending: true })
    .order("board_position", { ascending: true });

  if (error) {
    console.error("[admin/tasks GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load tasks." }, { status: 500 });
  }

  const assigneeIds = Array.from(new Set((data ?? []).map((t) => t.assignee_id).filter(Boolean)));
  const { data: assignees } = assigneeIds.length
    ? await admin.from("user_profiles").select("user_id, first_name, last_name").in("user_id", assigneeIds)
    : { data: [] as { user_id: string; first_name: string; last_name: string }[] };

  const nameById = new Map(
    (assignees ?? []).map((a) => [a.user_id, [a.first_name, a.last_name].filter(Boolean).join(" ") || "—"]),
  );

  return NextResponse.json({
    tasks: (data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      assigneeId: t.assignee_id,
      assigneeName: t.assignee_id ? nameById.get(t.assignee_id) || "Unknown" : null,
      dueDate: t.due_date,
      boardPosition: t.board_position,
      taskSeq: t.task_seq,
      progressPercent: t.progress_percent ?? 0,
      completedAt: t.completed_at,
      createdAt: t.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("tasks.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  const { count } = await admin
    .from("admin_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", parsed.data.status);

  const { data, error } = await admin
    .from("admin_tasks")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      category: parsed.data.category ?? null,
      assignee_id: parsed.data.assigneeId ?? null,
      due_date: parsed.data.dueDate ?? null,
      progress_percent: parsed.data.progressPercent ?? 0,
      board_position: count ?? 0,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/tasks POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "create_task",
    p_target_table: "admin_tasks",
    p_record_id: data.id,
    p_description: `Created task "${parsed.data.title}"`,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
