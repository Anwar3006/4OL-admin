"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import DataTable from "@/components/redesign/DataTable";
import { useExercises, useDeleteExercise } from "@/hooks/supabase-calls/useExercise";
import { useAddExerciseDialog, useViewExerciseDialog } from "@/stores/dialog-store";
import AddExerciseDialog from "../_components/add-exercise-dialog";
import { cn } from "@/lib/utils";
import ViewExerciseDialog from "../_components/view-exercise-dialog";

const ExercisesTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const exerciseDialog = useAddExerciseDialog();
  const viewDialog = useViewExerciseDialog();
  const { data, isLoading } = useExercises({ page, limit, search: debouncedSearch });
  const { mutate: deleteExercise } = useDeleteExercise();

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleEdit = useCallback(
    (row: any) => {
      exerciseDialog.open(row);
    },
    [exerciseDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this exercise?")) {
        deleteExercise(id);
      }
    },
    [deleteExercise],
  );

  const columns = [
    {
      key: "id",
      label: "#",
      width: "50px",
      render: (_: any, row: any) => {
        // Since we don't have access to the index here directly, 
        // and DataTable renders paginated data, we might need a different approach 
        // for the ID numbering, or just use the row ID if available. 
        // For now, to fix the type error, I will change the signature.
        return <span className="text-slate-400 font-medium">#</span>;
      }
    },
    {
      key: "name",
      label: "Exercise Name",
      render: (val: string, row: any) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{row.exercise_name}</div>
        </div>
      )
    },
    {
      key: "category",
      label: "Category",
      render: (val: string) => (
        <span className="badge badge-blue capitalize">{val || "Equipment"}</span>
      )
    },
    {
      key: "muscle_groups",
      label: "Muscle Groups",
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(val || ["Chest", "Triceps"]).map((m, i) => (
            <span key={i} className="badge badge-purple">{m}</span>
          ))}
        </div>
      )
    },
    {
      key: "equipment",
      label: "Equipment",
      render: (val: string) => <span className="text-[11px] text-slate-600">{val || "None"}</span>
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (val: number) => (
        <div className="text-ek-gold text-[10px]">
          {"⭐".repeat(val || 5)}
          <span className="text-slate-200">{"⭐".repeat(5 - (val || 5))}</span>
        </div>
      )
    },
    {
      key: "sets_reps",
      label: "Sets   Reps",
      render: (_: any, row: any) => <span className="text-[11px] text-slate-600 font-medium">{row.sets || 3}   {row.reps || "10-12"}</span>
    },
    {
       key: "rest",
       label: "Rest",
       render: (val: string) => <span className="text-[11px] text-slate-600">{val || "60s"}</span>
    },
    {
      key: "tier",
      label: "Tier",
      render: (val: string) => (
        <span className={cn(
          "badge",
          val === 'free' ? 'bg-slate-700 text-white' : 'badge-amber'
        )}>{val || "Free"}</span>
      )
    },
    {
      key: "featured",
      label: "Featured",
      render: (val: boolean) => (
        <div className="text-center">
          {val ? <span className="text-ek-gold">🏆</span> : <span className="text-slate-300">—</span>}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge",
          val === 'inactive' ? 'bg-slate-700 text-white' : 'badge-green'
        )}>{val || "Active"}</span>
      )
    }
  ];

  const rowActions = [
    { label: "Edit", icon: "✏️", onClick: handleEdit },
    { label: "View", icon: "👁️", onClick: (row: any) => viewDialog.open(row.id) },
    { label: "Duplicate", icon: "📋", onClick: (row: any) => console.log('Copy', row) },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => handleDelete(row.id), danger: true },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <input 
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all" 
              placeholder="🔍 Search exercises by name, muscle group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50"><option>Category: All</option></select>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50"><option>Muscle: All</option></select>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50"><option>Difficulty: All</option></select>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50"><option>Status: Active</option></select>
          <button className="btn btn-secondary">📥 Export CSV</button>
          <button className="btn btn-primary text-white" onClick={() => exerciseDialog.open()}>+ Add Exercise</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.exercises || []}
          rowActions={rowActions}
          selectable
          itemsPerPage={limit}
        />
      </div>

      {/* Super Admin Commands */}
      <div className="mt-5">
        <div 
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-t-xl cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={(e) => {
            const next = e.currentTarget.nextElementSibling;
            if (next) next.classList.toggle('hidden');
          }}
        >
          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            🛡️ Super Admin Commands   Exercises & Workouts
          </div>
          <span className="text-[10px] text-slate-400">▼</span>
        </div>
        <div className="bg-white border border-slate-200 border-top-0 rounded-b-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="w-1/4">Action</th>
                <th>What It Does</th>
                <th className="w-1/6 text-right">Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-slate-700">Add Exercise</td>
                <td className="text-slate-500">Form: name, category, muscle groups, equipment, sets/reps, rest, image/video upload, difficulty, goal tags, training styles, age range</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <span className="badge badge-red">Super Admin</span>
                    <span className="badge badge-blue">Editor</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-700">Edit Exercise</td>
                <td className="text-slate-500">Modal edit any field except exercise_id</td>
                <td className="text-right">
                   <div className="flex justify-end gap-1">
                    <span className="badge badge-red">Super Admin</span>
                    <span className="badge badge-blue">Editor</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <AddExerciseDialog />
      <ViewExerciseDialog />
    </div>
  );
};

// export default ExercisesTab;
// le>
//         </div>
//       </div>

//       <AddExerciseDialog />
//     </div>
//   );
// };

export default ExercisesTab;
