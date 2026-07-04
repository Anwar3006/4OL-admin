"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { exerciseColumns } from "@/components/Data-Table/columns/exerciseColumns";
import {
  useExercises,
  useDeleteExercise,
} from "@/hooks/supabase-calls/useExercise";
import {
  useAddExerciseDialog,
  useViewExerciseDialog,
} from "@/stores/dialog-store";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import AddExerciseDialog from "../_components/add-exercise-dialog";
import ViewExerciseDialog from "../_components/view-exercise-dialog";
import { useSearchParams } from "next/navigation";

const ExercisesTab = () => {
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_exercise_page") || "1", 10);
  const pageSize = 10;

  const exerciseDialog = useAddExerciseDialog();
  const viewDialog = useViewExerciseDialog();

  const { data, isLoading } = useExercises({ page, limit: pageSize, search });
  const { mutate: deleteExercise } = useDeleteExercise();

  const exercises = data?.exercises || [];
  const totalItems = data?.meta?.total || 0;

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.name,
      subtitle: (data) => data.category,
      badge: (data) => (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-100">
          {data.difficulty}
        </span>
      ),
    },
    fields: [
      { id: "muscle", label: "Muscle", render: (data) => data.target_muscle },
    ],
    actions: [
      { label: "View Details", onClick: (data) => viewDialog.open(data.id) },
      { label: "Edit Exercise", onClick: (data) => exerciseDialog.open(data) },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="h-9 px-4 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all"
          onClick={() => exerciseDialog.open()}
        >
          + Add Exercise
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={exerciseColumns}
          data={exercises}
          isLoading={isLoading}
          onRowClick={(row) => viewDialog.open(row.id)}
          onDeleteSelected={(rows) => {
            if (confirm(`Delete ${rows.length} exercises?`)) {
              rows.forEach((r) => deleteExercise(r.id));
            }
          }}
          cardConfig={cardConfig}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_exercise_page",
            pageSizeKey: "fit_exercise_pageSize",
          }}
          totalItems={totalItems}
        />
      </div>

      <AddExerciseDialog />
      <ViewExerciseDialog />
    </div>
  );
};

export default ExercisesTab;
