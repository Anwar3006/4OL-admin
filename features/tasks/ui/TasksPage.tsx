"use client";

import React, { useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import { useHasPermission } from "@/stores/permission-context";
import TaskStats from "./TaskStats";
import KanbanBoard from "./KanbanBoard";
import NewTaskDialog from "./NewTaskDialog";

const TasksPage = () => {
  const canEdit = useHasPermission("tasks.edit");
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="📋 Task Manager"
        subtitle="Assign & track tasks across the admin team · Super Admin only"
      >
        <button
          className="btn btn-secondary btn-sm font-bold"
          onClick={() => window.open("/api/admin/tasks/export", "_blank")}
        >
          📥 Export Tasks
        </button>
        {canEdit && (
          <button
            className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]"
            onClick={() => setNewTaskOpen(true)}
          >
            + New Task
          </button>
        )}
      </PageHeader>

      <TaskStats />

      <KanbanBoard />

      <NewTaskDialog open={newTaskOpen} status="new" onClose={() => setNewTaskOpen(false)} />
    </div>
  );
};

export default TasksPage;
