"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useViewFitnessPlanDialog,
  useAddFitnessPlanDialog,
} from "@/stores/dialog-store";
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

export function ViewFitnessPlanDialog() {
  const { isOpen, close, entityId } = useViewFitnessPlanDialog();
  const { open: openAdd } = useAddFitnessPlanDialog();
  const { data, isLoading } = useFitnessPlan(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-4xl p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[90vh] overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.title ? `Details for ${data.title}` : "Fitness Plan Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-white">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
              <div className="relative w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-emerald-600 animate-pulse" />
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
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-5 bg-white min-h-[400px]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <Ban className="h-10 w-10" />
            </div>
            <p className="text-slate-900 font-bold text-lg">Plan Not Found</p>
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
  data: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const statusColors: Record<string, string> = {
    published:
      "bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-200",
    draft: "bg-amber-100 text-amber-800 border-none hover:bg-amber-200",
    archived: "bg-slate-100 text-slate-800 border-none hover:bg-slate-200",
  };

  const currentStatus = (data.status || "published").toLowerCase();
  const statusBadgeClass =
    statusColors[currentStatus] || statusColors.published;

  const difficultyColors: Record<string, string> = {
    beginner: "bg-blue-50 text-blue-700 border-blue-200",
    intermediate: "bg-purple-50 text-purple-700 border-purple-200",
    advanced: "bg-red-50 text-red-700 border-red-200",
  };
  const diffClass =
    difficultyColors[(data.difficulty_level || "").toLowerCase()] ||
    "bg-slate-50 text-slate-700 border-slate-200";

  // Array parsing fallbacks for Postgres Arrays
  const targetBodyParts = Array.isArray(data.target_body_parts)
    ? data.target_body_parts
    : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const tags = Array.isArray(data.tags) ? data.tags : [];

  return (
    <>
      {/* ── Sticky Top Bar Header ── */}
      <div className="bg-white sticky top-0 z-30 px-6 py-6 md:px-10 border-b border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-sm ${statusBadgeClass}`}
              >
                {data.status || "Published"}
              </Badge>
              <Badge
                variant="outline"
                className={`font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-sm ${diffClass}`}
              >
                {data.difficulty_level || "General"}
              </Badge>
              {data.is_premium && (
                <Badge className="bg-amber-500 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-sm border-none">
                  👑 Premium
                </Badge>
              )}
              {data.is_featured && (
                <Badge className="bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-sm border-none">
                  ✨ Featured
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-black leading-tight">
              {data.title}
            </h2>
            {data.coach_display_name && (
              <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Public attribution: &quot;by {data.coach_display_name}&quot;
              </p>
            )}
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
              className="flex-1 md:flex-none rounded-xl shadow-lg shadow-emerald-600/20 px-6 h-11 font-black uppercase tracking-widest text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95"
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
              className="h-11 w-11 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content Bento ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Context Panels */}
          <div className="lg:col-span-7 space-y-6">
            {/* Description Section */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="font-black uppercase tracking-[0.15em] text-sm text-black">
                  Plan Description
                </h3>
              </div>
              <p className="text-[15px] text-slate-600 leading-relaxed font-medium">
                {data.description ||
                  "No description provided for this fitness plan."}
              </p>
            </div>

            {/* Targets & Goals Section */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              {/* Target Body Parts */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <h3 className="font-black uppercase tracking-[0.15em] text-sm text-black">
                    Target Body Parts
                  </h3>
                </div>
                {targetBodyParts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {targetBodyParts.map((part: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-none font-bold rounded-lg px-3 py-1.5 text-xs"
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
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-black uppercase tracking-[0.15em] text-sm text-black">
                    Plan Goals
                  </h3>
                </div>
                {goals.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {goals.map((goal: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100 font-bold rounded-lg px-3 py-1.5 text-xs"
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
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500">
                      <Tag className="h-5 w-5" />
                    </div>
                    <h3 className="font-black uppercase tracking-[0.15em] text-sm text-black">
                      Tags
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md"
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
            {/* Timeline Breakdown Widget */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                    Plan Duration
                  </span>
                  <p className="text-sm font-black text-black leading-tight">
                    {data.duration_weeks}{" "}
                    {data.duration_weeks === 1 ? "Week" : "Weeks"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 pt-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
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
                <div className="flex items-center gap-4 border-t border-slate-100 pt-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 text-slate-600 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                      Author Category
                    </span>
                    <p className="text-sm font-black text-slate-800 leading-tight capitalize">
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
                <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-black uppercase tracking-[0.15em] text-sm text-white">
                  Completions & Feedback
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Total Completions
                  </span>
                  <p className="text-2xl font-black text-white tracking-tight">
                    {(data.total_completions ?? 0).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1 border-l border-white/10 pl-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Average Rating
                  </span>
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-black text-white tracking-tight">
                      {Number(data.average_rating || 0).toFixed(1)}
                    </p>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    from {data.rating_count ?? 0} scores
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps Meta Box */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  Date Created
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {data.created_at
                    ? new Date(data.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="text-center sm:text-left space-y-1 border-l border-slate-100 pl-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  Last Updated
                </span>
                <span className="text-xs font-bold text-slate-700">
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
      </div>
    </>
  );
}
