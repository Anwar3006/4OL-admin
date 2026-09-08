"use client";

import React, { useMemo, useState } from "react";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useAdminTasks,
  useMoveAdminTask,
  type AdminTask,
} from "@/features/tasks/data/useAdminTasks";
import { useHasPermission } from "@/stores/permission-context";
import NewTaskDialog from "./NewTaskDialog";
import TaskDetailDialog from "./TaskDetailDialog";

const COLUMNS: { status: AdminTask["status"]; title: string; color: string }[] = [
  { status: "new", title: "New Task", color: "bg-ek-blue" },
  { status: "in_progress", title: "In Progress", color: "bg-ek-gold" },
  { status: "under_review", title: "Under Review", color: "bg-ek-purple" },
  { status: "completed", title: "Completed", color: "bg-ek-green" },
];

const PRIORITY_STYLE: Record<AdminTask["priority"], string> = {
  critical: "bg-slate-900 text-white",
  high: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:text-yellow-400",
  low: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400",
};

function initials(name: string | null) {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function seqLabel(task: AdminTask) {
  return task.taskSeq ? `T-${String(task.taskSeq).padStart(3, "0")}` : task.id.slice(0, 8);
}

// Due badge is red when the due date is today or already past (Gap D.3).
function isDueUrgent(task: AdminTask) {
  if (!task.dueDate || task.status === "completed") return false;
  const due = startOfDay(new Date(task.dueDate));
  return isToday(due) || isPast(due);
}

export default function KanbanBoard() {
  const { data, isLoading, isError } = useAdminTasks();
  const moveTask = useMoveAdminTask();
  const canEdit = useHasPermission("tasks.edit");
  const [dialogStatus, setDialogStatus] = useState<AdminTask["status"] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, AdminTask[]> = { new: [], in_progress: [], under_review: [], completed: [] };
    for (const task of data?.tasks ?? []) {
      (grouped[task.status] ??= []).push(task);
    }
    return grouped;
  }, [data]);

  const handleDrop = (status: AdminTask["status"]) => {
    if (!draggingId) return;
    const targetCount = tasksByStatus[status]?.length ?? 0;
    moveTask.mutate({ id: draggingId, status, boardPosition: targetCount });
    setDraggingId(null);
  };

  if (isError) {
    return <div className="text-center text-red-500 text-sm py-10">Failed to load tasks.</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const tasks = tasksByStatus[col.status] ?? [];
          return (
            <div
              key={col.status}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", col.color)} />
                  <span className="section-heading">{col.title}</span>
                  <span className="badge badge-secondary text-3xs font-black">{isLoading ? "…" : tasks.length}</span>
                </div>
                {canEdit && (
                  <button
                    className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all font-bold"
                    onClick={() => setDialogStatus(col.status)}
                    aria-label={`Add task to ${col.title}`}
                  >
                    +
                  </button>
                )}
              </div>
              <div className="p-2 space-y-3 flex-1">
                {isLoading && <div className="text-center text-xs text-slate-400 py-6">Loading…</div>}
                {!isLoading && tasks.length === 0 && (
                  <div className="text-center text-xs text-slate-300 py-6">No tasks</div>
                )}
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={() => setDraggingId(t.id)}
                    onClick={() => setSelectedTask(t)}
                    className={cn(
                      "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group",
                      canEdit && "cursor-grab active:cursor-grabbing",
                      t.status === "completed" && "opacity-60",
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn("text-3xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full", PRIORITY_STYLE[t.priority])}>
                        {t.priority}
                      </span>
                      <span className="text-3xs font-mono font-bold text-slate-300 group-hover:text-slate-500">
                        {seqLabel(t)}
                      </span>
                    </div>
                    <h4 className={cn("text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug mb-1", t.status === "completed" && "line-through text-slate-400")}>
                      {t.title}
                    </h4>
                    {t.description && (
                      <p className="text-2xs text-slate-400 font-medium leading-relaxed mb-3">{t.description}</p>
                    )}
                    {t.status === "in_progress" && (
                      <div className="mb-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-ek-gold to-amber-500 transition-all"
                            style={{ width: `${t.progressPercent ?? 0}%` }}
                          />
                        </div>
                        <span className="text-3xs font-black text-slate-400">{t.progressPercent ?? 0}% complete</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 border-t border-slate-50 pt-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-ek-green to-ek-teal flex items-center justify-center text-3xs font-black text-white">
                        {initials(t.assigneeName)}
                      </div>
                      {t.category && (
                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-tighter">{t.category}</span>
                      )}
                      {t.completedAt ? (
                        <span className="ml-auto text-3xs font-black text-ek-green-dark">
                          ✅ {format(new Date(t.completedAt), "MMM yyyy")}
                        </span>
                      ) : t.dueDate ? (
                        <span
                          className={cn(
                            "ml-auto text-3xs font-black",
                            isDueUrgent(t)
                              ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15 px-1.5 py-0.5 rounded-md"
                              : "text-slate-400",
                          )}
                        >
                          {isDueUrgent(t) ? "⚠ " : ""}Due: {format(new Date(t.dueDate), "MMM d")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <NewTaskDialog open={dialogStatus !== null} status={dialogStatus} onClose={() => setDialogStatus(null)} />
      <TaskDetailDialog task={selectedTask} canEdit={canEdit} onClose={() => setSelectedTask(null)} />
    </>
  );
}
