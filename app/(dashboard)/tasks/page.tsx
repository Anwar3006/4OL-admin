"use client";

import React from "react";
import PageHeader from "@/components/redesign/PageHeader";
import TaskStats from "./_components/TaskStats";
import KanbanBoard from "./_components/KanbanBoard";

const TasksPage = () => {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="📋 Task Manager"
        subtitle="Assign & track tasks across the admin team · Super Admin only"
      >
        <button className="btn btn-secondary btn-sm font-bold">📥 Export Tasks</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ New Task</button>
      </PageHeader>

      <TaskStats />

      <KanbanBoard />
    </div>
  );
};

export default TasksPage;
