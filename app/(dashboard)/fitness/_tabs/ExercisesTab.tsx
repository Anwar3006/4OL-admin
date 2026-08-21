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
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { toast } from "sonner";

/**
 * Exercises tab (Gap Analysis Part V) — mockup toolbar: search + 6 filter
 * selects (Category / Muscle Group / Difficulty / Goal Tags / Tier / Status)
 * + CSV export. All filters map server-side to fitness_exercises columns.
 */

const CATEGORIES = ["Strength", "Cardio", "Flexibility", "HIIT", "Balance"];
const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Legs",
  "Glutes",
  "Full Body",
];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const GOAL_TAGS = ["weight_loss", "muscle_gain", "endurance", "flexibility", "general_fitness"];
const TIERS = ["free", "pro", "premium"];
const STATUSES = ["draft", "published", "archived"];

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      <option value="">{label}: All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

const ExercisesTab = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [goalTag, setGoalTag] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDeleteRows, setPendingDeleteRows] = useState<any[] | null>(null);
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_exercise_page") || "1", 10);
  const pageSize = 10;

  const exerciseDialog = useAddExerciseDialog();
  const viewDialog = useViewExerciseDialog();

  const { data, isLoading, isError, error } = useExercises({
    page,
    limit: pageSize,
    search,
    category: category || undefined,
    muscleGroup: muscleGroup || undefined,
    difficulty: difficulty || undefined,
    goalTag: goalTag || undefined,
    tier: tier || undefined,
    status: status || undefined,
  });
  const { mutate: deleteExercise } = useDeleteExercise();

  const exercises = data?.exercises || [];
  const totalItems = data?.meta?.total || 0;

  // CSV export of the currently-filtered page set (client-side, no extra
  // RPC needed — the filtered rows are already loaded).
  const exportCsv = () => {
    if (exercises.length === 0) {
      toast.error("Nothing to export for the current filters.");
      return;
    }
    const header = [
      "Name",
      "Category",
      "Primary Muscle Group",
      "Equipment",
      "Difficulty",
      "Sets",
      "Reps/Duration",
      "Rest (s)",
      "Tier",
      "Featured",
      "Status",
    ];
    const esc = (value: unknown) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = exercises.map((row: any) =>
      [
        row.exercise_name,
        row.category,
        row.primary_muscle_group,
        row.equipment_required,
        row.difficulty_level,
        row.default_sets,
        row.default_reps_duration,
        row.rest_time_seconds,
        row.tier,
        row.is_featured ? "yes" : "no",
        row.status,
      ]
        .map(esc)
        .join(","),
    );
    const csv = [header.map(esc).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fitness-exercises-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exercises.length} exercises.`);
  };

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.exercise_name,
      subtitle: (data) => data.category,
      badge: (data) => (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-100">
          {data.difficulty_level}
        </span>
      ),
    },
    fields: [
      { id: "muscle", label: "Muscle", render: (data) => data.primary_muscle_group },
      { id: "status", label: "Status", render: (data) => data.status },
    ],
    actions: [
      { label: "View Details", onClick: (data) => viewDialog.open(data.id) },
      { label: "Edit Exercise", onClick: (data) => exerciseDialog.open(data) },
    ],
  };

  const hasFilters = Boolean(
    category || muscleGroup || difficulty || goalTag || tier || status || search,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        <FilterSelect label="Muscle" value={muscleGroup} options={MUSCLE_GROUPS} onChange={setMuscleGroup} />
        <FilterSelect label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} />
        <FilterSelect label="Goal" value={goalTag} options={GOAL_TAGS} onChange={setGoalTag} />
        <FilterSelect label="Tier" value={tier} options={TIERS} onChange={setTier} />
        <FilterSelect label="Status" value={status} options={STATUSES} onChange={setStatus} />
        <button
          className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-all"
          onClick={exportCsv}
        >
          📥 Export CSV
        </button>
        <button
          className="h-9 px-4 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all"
          onClick={() => exerciseDialog.open()}
        >
          + Add Exercise
        </button>
      </div>

      {hasFilters && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {totalItems.toLocaleString()} exercise{totalItems === 1 ? "" : "s"} match the current filters
          <button
            className="ml-2 text-emerald-700 hover:underline normal-case"
            onClick={() => {
              setSearch("");
              setCategory("");
              setMuscleGroup("");
              setDifficulty("");
              setGoalTag("");
              setTier("");
              setStatus("");
            }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={exerciseColumns}
          data={exercises}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => viewDialog.open(row.id)}
          onDeleteSelected={(rows) => setPendingDeleteRows(rows)}
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

      <DeleteConfirmationModal
        isOpen={!!pendingDeleteRows}
        onClose={() => setPendingDeleteRows(null)}
        onConfirm={() => {
          pendingDeleteRows?.forEach((r) => deleteExercise(r.id));
          setPendingDeleteRows(null);
        }}
        title={`Delete ${pendingDeleteRows?.length || ""} Exercise${pendingDeleteRows?.length === 1 ? "" : "s"}`}
        itemName=""
        itemType="exercise"
      />
    </div>
  );
};

export default ExercisesTab;
