"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useViewFitnessPlanDialog, useAddFitnessPlanDialog } from "@/features/fitness/data/dialog-hooks";
import { useFitnessPlan } from "@/features/fitness/data/useFitnessPlan";
import {
  ClipboardList,
  Clock,
  Calendar,
  Star,
  Target,
  Tag,
  Pencil,
  Trash2,
  X,
  Ban,
  CheckCircle2,
  User,
  TrendingUp,
} from "lucide-react";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { TopRatedToggle } from "@/components/redesign/TopRatedToggle";
import type { FitnessPlanDetail } from "@/features/fitness/data/useFitnessPlan";

export function ViewFitnessPlanDialog() {
  const { isOpen, close, entityId } = useViewFitnessPlanDialog();
  const { open: openAdd } = useAddFitnessPlanDialog();
  const { data, isLoading } = useFitnessPlan(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-4xl p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl rounded-none max-h-[90vh] overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.title ? `Details for ${data.title}` : "Fitness Plan Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-white dark:bg-slate-800">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-500/20 rounded-full animate-ping opacity-50" />
              <div className="relative w-16 h-16 bg-emerald-50 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
            </div>
            <span className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest">
              Retrieving Fitness Plan...
            </span>
          </div>
        ) : data ? (
          <DetailView
            data={data}
            onEdit={() => {
              close();
              openAdd(data);
            }}
            onDelete={() => setShowDeleteModal(true)}
            onClose={close}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-5 bg-white dark:bg-slate-800 min-h-[400px]">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300">
              <Ban className="h-10 w-10" />
            </div>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">Plan Not Found</p>
            <p className="text-slate-500 font-medium max-w-sm">
              This fitness plan may have been removed or updated.
            </p>
            <Button
              onClick={close}
              className="bg-black hover:bg-slate-800 text-white rounded-xl px-8 mt-2"
            >
              Close Panel
            </Button>
          </div>
        )}
      </DialogContent>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          close();
        }}
        title="Delete Fitness Plan"
        itemName={data?.title || ""}
        itemType="fitness plan"
      />
    </Dialog>
  );
}

/* ───────────────────────────────────────────────────────────
   Detail View Component
   ─────────────────────────────────────────────────────────── */

function DetailView({
  data,
  onEdit,
  onDelete,
  onClose,
}: {
  data: FitnessPlanDetail;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const statusColors: Record<string, string> = {
    published:
      "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-none hover:bg-emerald-200",
    draft: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 border-none hover:bg-amber-200",
    archived: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none hover:bg-slate-200",
  };

  const currentStatus = (data.status || "published").toLowerCase();
  const statusBadgeClass =
    statusColors[currentStatus] || statusColors.published;

  const difficultyColors: Record<string, string> = {
    beginner: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200",
    intermediate: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200",
    advanced: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200",
  };
  const diffClass =
    difficultyColors[(data.difficulty_level || "").toLowerCase()] ||
    "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  // Array parsing fallbacks for Postgres Arrays
  const targetBodyParts = Array.isArray(data.target_body_parts)
    ? data.target_body_parts
    : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const members = data.fitness_user_assignments ?? [];
  const coachName = data.coach_display_name?.trim() || "No public coach assigned";

  return (
    <>
      {/* ── Sticky Top Bar Header ── */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-30 px-6 py-6 md:px-10 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm ${statusBadgeClass}`}
              >
                {data.status || "Published"}
              </Badge>
              <Badge
                variant="outline"
                className={`font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm ${diffClass}`}
              >
                {data.difficulty_level || "General"}
              </Badge>
              {data.is_premium && (
                <Badge className="bg-amber-500 text-white font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm border-none">
                  👑 Premium
                </Badge>
              )}
              {data.is_featured && (
                <Badge className="bg-indigo-600 text-white font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm border-none">
                  ✨ Featured
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-black leading-tight">
              {data.title}
            </h2>
            <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Public coach: {coachName}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto pt-2 md:pt-0">
            <TopRatedToggle
              compact
              module="fitness_plan"
              itemId={data.id}
              title={data.title}
              subtitle={data.difficulty_level}
              rating={data.average_rating}
              ratingCount={data.rating_count}
            />

            <Button
              onClick={onEdit}
              className="flex-1 md:flex-none rounded-xl shadow-lg shadow-emerald-600/20 px-6 h-11 font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Plan
            </Button>
            <Button
              variant="ghost"
              onClick={onDelete}
              className="h-11 w-11 rounded-xl text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-11 w-11 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content Bento ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Context Panels */}
          <div className="lg:col-span-7 space-y-6">
            {/* Description Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="section-heading">
                  Plan Description
                </h3>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {data.description ||
                  "No description provided for this fitness plan."}
              </p>
            </div>

            {/* Targets & Goals Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              {/* Target Body Parts */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Target className="h-5 w-5" />
                  </div>
                  <h3 className="section-heading">
                    Target Body Parts
                  </h3>
                </div>
                {targetBodyParts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {targetBodyParts.map((part: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 border-none font-bold rounded-lg px-3 py-1.5 text-xs"
                      >
                        {part}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400 italic pl-1">
                    No target body parts configured.
                  </p>
                )}
              </div>

              {/* Goals */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="section-heading">
                    Plan Goals
                  </h3>
                </div>
                {goals.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {goals.map((goal: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/30 font-bold rounded-lg px-3 py-1.5 text-xs"
                      >
                        🎯 {goal}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400 italic pl-1">
                    No localized milestones or goals mapped.
                  </p>
                )}
              </div>

              {/* Tags Section */}
              {tags.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500">
                      <Tag className="h-5 w-5" />
                    </div>
                    <h3 className="section-heading">
                      Tags
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metrics Bento Row */}
          <div className="lg:col-span-5 space-y-6">
            {/* Public coach ownership */}
            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-2xl bg-white p-3.5 text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-2xs font-black uppercase tracking-widest text-emerald-700/70 dark:text-emerald-300/70">
                      Public Coach Name
                    </span>
                    <p className="mt-1 truncate text-base font-black text-slate-900 dark:text-white">
                      {coachName}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Displayed on this plan in the mobile app.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="shrink-0 rounded-xl border-emerald-200 bg-white font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-slate-800 dark:text-emerald-400"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>

            {/* Timeline Breakdown Widget */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                    Plan Duration
                  </span>
                  <p className="text-sm font-black text-black leading-tight">
                    {data.duration_weeks}{" "}
                    {data.duration_weeks === 1 ? "Week" : "Weeks"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                    Frequency Split
                  </span>
                  <p className="text-sm font-black text-black leading-tight">
                    {data.workouts_per_week}{" "}
                    {data.workouts_per_week === 1 ? "Workout" : "Workouts"} /
                    Week
                  </p>
                </div>
              </div>

              {data.author_type && (
                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                      Author Category
                    </span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight capitalize">
                      {data.author_type} Module
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Engagement Metric Card */}
            <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-900/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 rounded-xl bg-white/10 dark:bg-slate-800/10 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-black uppercase tracking-[0.15em] text-sm text-white">
                  Completions & Feedback
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 pt-2">
                <div className="space-y-1">
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block">
                    Total Completions
                  </span>
                  <p className="text-2xl font-black text-white tracking-tight">
                    {(data.total_completions ?? 0).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1 border-l border-white/10 pl-4">
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block">
                    Average Rating
                  </span>
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-black text-white tracking-tight">
                      {Number(data.average_rating || 0).toFixed(1)}
                    </p>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  </div>
                  <span className="text-2xs text-slate-400 block">
                    from {data.rating_count ?? 0} scores
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps Meta Box */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-2 gap-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-3xs font-black uppercase tracking-widest text-slate-400 block">
                  Date Created
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {data.created_at
                    ? new Date(data.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="text-center sm:text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-4">
                <span className="text-3xs font-black uppercase tracking-widest text-slate-400 block">
                  Last Updated
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {data.updated_at
                    ? new Date(data.updated_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled plan members */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="section-heading">Users on this plan</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Names and current progress for every enrolled fitness user.
              </p>
            </div>
            <Badge className="w-fit border-none bg-slate-100 px-3 py-1.5 font-black text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200">
              {members.length.toLocaleString()} enrolled
            </Badge>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <User className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                No users are enrolled in this plan yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-2xs font-black uppercase tracking-widest text-slate-400 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Workouts</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-6 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {members.map((member) => {
                    const fullName = [member.user?.first_name, member.user?.last_name]
                      .filter(Boolean)
                      .join(" ") || "Unknown user";
                    const initials = fullName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const statusTone =
                      member.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : member.status === "abandoned"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";

                    return (
                      <tr key={member.id} className="text-sm text-slate-600 dark:text-slate-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                              {initials || "?"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{fullName}</div>
                              <div className="text-xs text-slate-400">Fitness member</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wider ${statusTone}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold">
                          Week {member.current_week}, day {member.current_day_number}
                        </td>
                        <td className="px-4 py-4 font-bold tabular-nums">
                          {member.total_workouts_completed.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          {new Date(member.started_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>
                        <td className="px-6 py-4">
                          {member.completed_at
                            ? new Date(member.completed_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
