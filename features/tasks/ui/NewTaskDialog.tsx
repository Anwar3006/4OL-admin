"use client";

import React, { useState } from "react";
import {
  useCreateAdminTask,
  type AdminTask,
} from "@/features/tasks/data/useAdminTasks";
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

// Fixed category list (Gap Analysis Part D, decision D-D3 UI) — replaces
// free-text entry so board categories stay consistent.
export const TASK_CATEGORIES = [
  "🛠 Dev",
  "🔐 Security",
  "📊 Reports",
  "🏥 Facilities",
  "💰 Finance",
  "📣 Marketing",
  "🏢 IBP",
  "⚖️ Compliance",
  "🩺 HCP",
  "📝 Content",
  "🗂 Admin",
];

export default function NewTaskDialog({
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
      category: category || undefined,
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
            <select
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">No category</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
