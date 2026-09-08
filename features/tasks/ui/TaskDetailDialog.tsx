"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  useDeleteAdminTask,
  useUpdateAdminTask,
  type AdminTask,
} from "@/features/tasks/data/useAdminTasks";
import { useUsers } from "@/features/users/data/useUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TASK_CATEGORIES } from "./NewTaskDialog";

const STATUS_LABEL: Record<AdminTask["status"], string> = {
  new: "New Task",
  in_progress: "In Progress",
  under_review: "Under Review",
  completed: "Completed",
};

// Card dialog (Gap Analysis Part D) — view a task read-only, or edit/delete
// when the caller holds tasks.edit.
export default function TaskDetailDialog({
  task,
  canEdit,
  onClose,
}: {
  task: AdminTask | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<AdminTask["priority"]>("medium");
  const [category, setCategory] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<AdminTask["status"]>("new");
  const [progressPercent, setProgressPercent] = useState(0);
  const updateTask = useUpdateAdminTask();
  const deleteTask = useDeleteAdminTask();
  const { data: adminsData } = useUsers({ admin: true, page: 1, limit: 100 });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setCategory(task.category ?? "");
      setAssigneeId(task.assigneeId ?? "");
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setStatus(task.status);
      setProgressPercent(task.progressPercent ?? 0);
    }
  }, [task]);

  if (!task) return null;

  const seqLabel = task.taskSeq ? `T-${String(task.taskSeq).padStart(3, "0")}` : task.id.slice(0, 8);

  const handleSave = async () => {
    if (!title.trim()) return;
    await updateTask.mutateAsync({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      category: category || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      status,
      progressPercent,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task ${seqLabel} "${task.title}"? This cannot be undone.`)) return;
    await deleteTask.mutateAsync({ id: task.id });
    onClose();
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {seqLabel} · {STATUS_LABEL[task.status]}
          </DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          // Read-only view for roles without tasks.edit.
          <div className="space-y-3 text-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-slate-500 whitespace-pre-wrap">{task.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div><span className="font-bold">Priority:</span> {task.priority}</div>
              <div><span className="font-bold">Category:</span> {task.category || "—"}</div>
              <div><span className="font-bold">Assignee:</span> {task.assigneeName || "Unassigned"}</div>
              <div><span className="font-bold">Due:</span> {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—"}</div>
              <div><span className="font-bold">Progress:</span> {task.progressPercent}%</div>
              <div><span className="font-bold">Created:</span> {format(new Date(task.createdAt), "MMM d, yyyy")}</div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="min-h-20 resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminTask["status"])}
              >
                {(Object.keys(STATUS_LABEL) as AdminTask["status"][]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <select
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AdminTask["priority"])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">No category</option>
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {task.category && !TASK_CATEGORIES.includes(task.category) && (
                  <option value={task.category}>{task.category}</option>
                )}
              </select>
              <select
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {(adminsData?.users ?? []).map((a: any) => (
                  <option key={a.user_id} value={a.user_id}>{a.name || a.email}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="flex-1 accent-emerald-600"
                  aria-label="Progress percent"
                />
                <span className="text-2xs font-black text-slate-500 w-9 text-right">{progressPercent}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                className="text-red-600 dark:text-red-400 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/15"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "Deleting…" : "🗑 Delete"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={!title.trim() || updateTask.isPending}>
                  {updateTask.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
