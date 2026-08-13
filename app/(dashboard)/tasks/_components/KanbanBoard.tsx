"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useAdminTasks,
  useCreateAdminTask,
  useMoveAdminTask,
  type AdminTask,
} from "@/hooks/supabase-calls/useAdminTasks";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const COLUMNS: { status: AdminTask["status"]; title: string; color: string }[] = [
  { status: "new", title: "New Task", color: "bg-ek-blue" },
  { status: "in_progress", title: "In Progress", color: "bg-ek-gold" },
  { status: "under_review", title: "Under Review", color: "bg-ek-purple" },
  { status: "completed", title: "Completed", color: "bg-ek-green" },
];

const PRIORITY_STYLE: Record<AdminTask["priority"], string> = {
  critical: "bg-slate-900 text-white",
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
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

function NewTaskDialog({
  open,
  status,
  onClose,
}: {
  open: boolean;
  status: AdminTask["status"] | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<AdminTask["priority"]>("medium");
  const [category, setCategory] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const createTask = useCreateAdminTask();
  const { data: adminsData } = useUsers({ admin: true, page: 1, limit: 100 });

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setAssigneeId("");
    setDueDate("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !status) return;
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      category: category.trim() || undefined,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold"
              value={priority}
              onChange={(e) => setPriority(e.target.value as AdminTask["priority"])}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <Input placeholder="Category (e.g. Dev, Security)" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {(adminsData?.users ?? []).map((a: any) => (
                <option key={a.user_id} value={a.user_id}>{a.name || a.email}</option>
              ))}
            </select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KanbanBoard() {
  const { data, isLoading, isError } = useAdminTasks();
  const moveTask = useMoveAdminTask();
  const [dialogStatus, setDialogStatus] = useState<AdminTask["status"] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
              className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", col.color)} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{col.title}</span>
                  <span className="badge badge-secondary text-[9px] font-black">{isLoading ? "…" : tasks.length}</span>
                </div>
                <button
                  className="w-6 h-6 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 transition-all font-bold"
                  onClick={() => setDialogStatus(col.status)}
                  aria-label={`Add task to ${col.title}`}
                >
                  +
                </button>
              </div>
              <div className="p-2 space-y-3 flex-1">
                {isLoading && <div className="text-center text-xs text-slate-400 py-6">Loading…</div>}
                {!isLoading && tasks.length === 0 && (
                  <div className="text-center text-xs text-slate-300 py-6">No tasks</div>
                )}
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggingId(t.id)}
                    className={cn(
                      "bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group",
                      t.status === "completed" && "opacity-60",
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", PRIORITY_STYLE[t.priority])}>
                        {t.priority}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-300 group-hover:text-slate-500">
                        {t.id.slice(0, 8)}
                      </span>
                    </div>
                    <h4 className={cn("text-xs font-bold text-slate-800 leading-snug mb-1", t.status === "completed" && "line-through text-slate-400")}>
                      {t.title}
                    </h4>
                    {t.description && (
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3">{t.description}</p>
                    )}
                    <div className="flex items-center gap-2 border-t border-slate-50 pt-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-ek-green to-ek-teal flex items-center justify-center text-[8px] font-black text-white">
                        {initials(t.assigneeName)}
                      </div>
                      {t.category && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.category}</span>
                      )}
                      {t.completedAt ? (
                        <span className="ml-auto text-[8px] font-black text-ek-green-dark">
                          ✅ {format(new Date(t.completedAt), "MMM yyyy")}
                        </span>
                      ) : t.dueDate ? (
                        <span className="ml-auto text-[9px] font-black text-slate-400">
                          Due: {format(new Date(t.dueDate), "MMM d")}
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
    </>
  );
}
