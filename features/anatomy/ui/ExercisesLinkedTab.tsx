"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAiMappings,
  useAnatomyExerciseLinks,
  useBodyParts,
  useDecideAiMapping,
  useLinkExerciseToBodyPart,
  useRunAiMap,
  useUnlinkExerciseFromBodyPart,
  type AiMappingRow,
} from "@/features/anatomy/data/useAnatomy";
import { useDebounce } from "@/hooks/use-debounce";
import { useExercises } from "@/hooks/supabase-calls/useExercise";
import { cn } from "@/lib/utils";

const inputCls =
  "h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

// fitness_exercises.primary_muscle_group — the 13 values currently in the
// catalog. Used to narrow the picker when bulk-linking a body part.
const MUSCLE_GROUPS = [
  "Back",
  "Biceps",
  "Cardiovascular",
  "Chest",
  "Core",
  "Flexibility",
  "Forearms",
  "Full Body",
  "Glutes",
  "Hips",
  "Legs",
  "Shoulders",
  "Triceps",
];

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "badge-green",
  intermediate: "badge-blue",
  advanced: "badge-amber",
  expert: "badge-red",
};

const confidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) return "badge-green";
  if (confidence >= 0.6) return "badge-amber";
  return "badge-red";
};

export default function ExercisesLinkedTab() {
  const [bodyPartId, setBodyPartId] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [reviewStatus, setReviewStatus] =
    useState<"proposed" | "approved" | "rejected">("proposed");
  const [batchSize, setBatchSize] = useState(10);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const debouncedExerciseSearch = useDebounce(exerciseSearch, 350);
  const debouncedLinkSearch = useDebounce(linkSearch, 350);

  // Any change to the filters invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedLinkSearch, bodyPartId]);

  const { data: parts } = useBodyParts("all");
  const { data: exerciseResults, isLoading: exercisesLoading } = useExercises({
    page: 1,
    limit: 8,
    search: debouncedExerciseSearch || undefined,
    muscleGroup: muscleGroup || undefined,
    status: "published",
  });
  const {
    data: linkData,
    isLoading: linksLoading,
    isFetching: linksFetching,
  } = useAnatomyExerciseLinks({
    search: debouncedLinkSearch || undefined,
    bodyPartId: bodyPartId || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const { data: reviewData, isLoading: reviewLoading } = useAiMappings(
    reviewStatus,
    "workout",
  );

  const linkExercise = useLinkExerciseToBodyPart();
  const unlinkExercise = useUnlinkExerciseFromBodyPart();
  const decide = useDecideAiMapping();
  const runAi = useRunAiMap();

  const bodyPartOptions = useMemo(
    () => (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );
  const exerciseOptions = exerciseResults?.exercises ?? [];
  const selectedExercise = exerciseOptions.find((ex) => ex.id === selectedExerciseId);
  const links = linkData?.links ?? [];
  const total = linkData?.total ?? 0;
  const pageCount = linkData?.pageCount ?? 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const mappings = reviewData?.mappings ?? [];

  const pickerOpen = debouncedExerciseSearch.length >= 2 || !!muscleGroup;
  const canLink = !!bodyPartId && !!selectedExerciseId && !linkExercise.isPending;

  const approveOne = (row: AiMappingRow) =>
    decide.mutate({ ids: [row.id], decision: "approved" });
  const rejectOne = (row: AiMappingRow) =>
    decide.mutate({ ids: [row.id], decision: "rejected" });

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
              💪 Linked Exercises
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Map catalog exercises to the body parts they train. These links feed
              the <strong>workouts</strong> section of the mobile body-part detail
              sheet via <code className="rounded bg-slate-100 px-1 font-mono">get_anatomy_body_part_bundle</code>.
            </p>
          </div>
          <Link href="/fitness?tab=exercises" className="btn btn-secondary btn-sm">
            Open Exercise Library →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr_1.3fr_auto]">
          <div>
            <label className={labelCls}>Body Part</label>
            <select
              className={`${inputCls} w-full`}
              value={bodyPartId}
              onChange={(e) => setBodyPartId(e.target.value)}
            >
              <option value="">Select body part…</option>
              {bodyPartOptions.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Muscle Group</label>
            <select
              className={`${inputCls} w-full`}
              value={muscleGroup}
              onChange={(e) => {
                setMuscleGroup(e.target.value);
                setSelectedExerciseId("");
              }}
            >
              <option value="">Any</option>
              {MUSCLE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Exercise</label>
            <input
              className={`${inputCls} w-full`}
              value={exerciseSearch}
              onChange={(e) => {
                setExerciseSearch(e.target.value);
                setSelectedExerciseId("");
              }}
              placeholder="Search exercise name…"
            />
            {pickerOpen && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                {exercisesLoading ? (
                  <div className="px-3 py-4 text-xs text-slate-400">
                    Searching exercises…
                  </div>
                ) : exerciseOptions.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-400">
                    No published exercises found.
                  </div>
                ) : (
                  exerciseOptions.map((exercise) => (
                    <button
                      key={exercise.id}
                      className={cn(
                        "block w-full border-b border-slate-50 px-3 py-2 text-left text-xs hover:bg-emerald-50",
                        selectedExerciseId === exercise.id && "bg-emerald-50",
                      )}
                      onClick={() => {
                        setSelectedExerciseId(exercise.id);
                        setExerciseSearch(exercise.exercise_name);
                      }}
                    >
                      <div className="font-bold text-slate-800">
                        {exercise.exercise_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="badge badge-blue">
                          {exercise.primary_muscle_group}
                        </span>
                        <span>{exercise.category}</span>
                        {exercise.equipment_required && (
                          <span>· {exercise.equipment_required}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-end">
            <button
              className="btn btn-primary btn-sm h-9 w-full disabled:opacity-50 lg:w-auto"
              disabled={!canLink}
              onClick={() =>
                linkExercise.mutate({
                  bodyPartId,
                  workoutId: selectedExerciseId,
                })
              }
            >
              {linkExercise.isPending ? "Linking…" : "+ Link Exercise"}
            </button>
          </div>
        </div>

        {selectedExercise && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
            Ready to link <strong>{selectedExercise.exercise_name}</strong> (
            {selectedExercise.primary_muscle_group}).
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
            Published Exercise Links
          </h3>
          <span className="badge badge-green">
            {linksLoading ? "…" : `${total.toLocaleString()} links`}
          </span>
          {linksFetching && !linksLoading && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Updating…
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} w-60`}
              placeholder="Search exercise name…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-3">Body Part</th>
                <th className="px-5 py-3">Exercise</th>
                <th className="px-5 py-3">Muscle Group</th>
                <th className="px-5 py-3">Difficulty</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linksLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <div
                          className="h-3 animate-pulse rounded bg-slate-100"
                          style={{ width: j === 1 ? "80%" : "55%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              {!linksLoading && links.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No exercises are linked to body parts yet. Link one above, or run
                    the AI mapper below.
                  </td>
                </tr>
              )}
              {!linksLoading &&
                links.map((row) => (
                  <tr
                    key={`${row.workout_id}-${row.body_part_id}`}
                    className="border-b border-slate-50 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3 font-bold text-slate-800">
                      {row.body_part_name}
                      {row.body_system && (
                        <div className="text-[10px] font-medium text-slate-400">
                          {row.body_system}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">
                        {row.exercise_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {[row.category, row.equipment_required, row.tier]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-blue">
                        {row.primary_muscle_group || "—"}
                      </span>
                      {row.secondary_muscles && (
                        <div className="mt-1 text-[10px] text-slate-400">
                          + {row.secondary_muscles}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "badge",
                          DIFFICULTY_BADGE[row.difficulty_level ?? ""] ?? "badge-slate",
                        )}
                      >
                        {row.difficulty_level || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          row.source === "ai" ? "badge badge-amber" : "badge badge-slate"
                        }
                      >
                        {row.source || "manual"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={unlinkExercise.isPending}
                        onClick={() =>
                          unlinkExercise.mutate({
                            workoutId: row.workout_id,
                            bodyPartId: row.body_part_id,
                          })
                        }
                      >
                        Unlink
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{" "}
              {total.toLocaleString()}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm disabled:opacity-40"
                disabled={page <= 1 || linksFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="font-bold text-slate-600">
                Page {page} of {pageCount}
              </span>
              <button
                className="btn btn-secondary btn-sm disabled:opacity-40"
                disabled={page >= pageCount || linksFetching}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
              AI Exercise Mapping Review
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Suggestions stay private until an admin approves them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Batch
              <input
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                min={1}
                max={25}
                type="number"
                value={batchSize}
                onChange={(e) =>
                  setBatchSize(Math.max(1, Math.min(25, Number(e.target.value) || 10)))
                }
              />
            </label>
            <button
              className="btn btn-secondary btn-sm"
              disabled={runAi.isPending}
              onClick={() =>
                runAi.mutate({
                  content_type: "workout",
                  unmapped_only: true,
                  batch_size: batchSize,
                })
              }
            >
              {runAi.isPending ? "Analyzing…" : "Propose Exercise Links"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["proposed", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${reviewStatus === status ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setReviewStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {reviewLoading ? (
          <p className="py-10 text-center text-xs text-slate-400">Loading suggestions…</p>
        ) : mappings.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">
            No {reviewStatus} exercise suggestions.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-2 pr-3">Exercise</th>
                  <th className="py-2 pr-3">Body Part</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Rationale</th>
                  {reviewStatus === "proposed" && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border-slate-50 align-top">
                    <td className="max-w-[260px] py-2.5 pr-3 font-bold text-slate-700">
                      {mapping.content_name}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-600">
                      {mapping.body_parts?.name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={cn("badge", confidenceBadge(Number(mapping.confidence)))}>
                        {Math.round(Number(mapping.confidence) * 100)}%
                      </span>
                    </td>
                    <td className="max-w-[360px] py-2.5 pr-3 text-slate-400">
                      {mapping.rationale ?? "—"}
                    </td>
                    {reviewStatus === "proposed" && (
                      <td className="py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={decide.isPending}
                            onClick={() => approveOne(mapping)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={decide.isPending}
                            onClick={() => rejectOne(mapping)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
