import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Task board export (Gap Analysis Part D) — CSV of all admin tasks.
// Gated by tasks.view (read-only export; no tasks.export key exists).
export async function GET() {
  const auth = await requireAdminApiUser("tasks.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_tasks")
    .select("title, description, status, priority, category, assignee_id, due_date, task_seq, progress_percent, completed_at, created_at")
    .order("task_seq", { ascending: true });

  if (error) {
    console.error("[admin/tasks/export] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to export tasks." }, { status: 500 });
  }

  const assigneeIds = Array.from(new Set((data ?? []).map((t) => t.assignee_id).filter(Boolean)));
  const { data: assignees } = assigneeIds.length
    ? await admin.from("user_profiles").select("user_id, first_name, last_name").in("user_id", assigneeIds)
    : { data: [] as { user_id: string; first_name: string; last_name: string }[] };
  const nameById = new Map(
    (assignees ?? []).map((a) => [a.user_id, [a.first_name, a.last_name].filter(Boolean).join(" ") || "—"]),
  );

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const header = ["Seq", "Title", "Description", "Status", "Priority", "Category", "Assignee", "Due Date", "Progress %", "Completed At", "Created At"];
  const rows = (data ?? []).map((t) => [
    t.task_seq ? `T-${String(t.task_seq).padStart(3, "0")}` : "",
    t.title ?? "",
    t.description ?? "",
    t.status ?? "",
    t.priority ?? "",
    t.category ?? "",
    t.assignee_id ? nameById.get(t.assignee_id) || "Unknown" : "",
    t.due_date ?? "",
    String(t.progress_percent ?? 0),
    t.completed_at ?? "",
    t.created_at ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-tasks-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
