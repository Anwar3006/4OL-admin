"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useViewExerciseDialog,
  useAddExerciseDialog,
} from "@/stores/dialog-store";
import { useExercise } from "@/hooks/supabase-calls/useExercise";
import { LexicalRenderer } from "@/components/LexicalRenderer";
import { hasLexicalContent } from "@/lib/utils";
import {
  Dumbbell,
  Target,
  Layers,
  Timer,
  Star,
  PlayCircle,
  BookOpen,
} from "lucide-react";

const ViewExerciseDialog = () => {
  const { isOpen, close, entityId } = useViewExerciseDialog();
  const { open: openAdd } = useAddExerciseDialog();
  const { data, isLoading } = useExercise(entityId!);

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
        <VisuallyHidden.Root>
          <DialogTitle>Exercise Details</DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading exercise details...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Exercise not found
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header Media Banner */}
            <div className="relative h-64 w-full bg-slate-900">
              <img
                src={data.thumbnail_url || "/placeholder-exercise.jpg"}
                alt={data.exercise_name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />

              <div className="absolute top-6 right-6 flex gap-2">
                <Badge className="bg-emerald-500 border-none px-4 uppercase text-xs font-bold tracking-wide">
                  {data.status || "published"}
                </Badge>
                {data.is_featured && (
                  <Badge className="bg-amber-500 border-none px-4 flex gap-1 text-xs font-bold tracking-wide">
                    <Star className="h-3 w-3 fill-current" /> FEATURED
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 px-3 uppercase text-xs font-bold"
                >
                  {data.tier === "pro" ? "Pro ✨" : "Free"}
                </Badge>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Dumbbell className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.category || "General Fitness"}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">
                  {data.exercise_name}
                </h2>
              </div>
            </div>

            {/* Scrollable Content Details */}
            <div className="p-8 space-y-8 flex-1">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Primary Muscle */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Muscle
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {data.primary_muscle_group || "Full Body"}
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Difficulty
                    </span>
                    <span className="text-xs font-bold text-slate-700 capitalize mt-0.5">
                      {data.difficulty_level || "beginner"}
                    </span>
                  </div>
                </div>

                {/* Sets & Reps */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sets × Reps/Duration
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.default_sets || "3"} ×{" "}
                      {data.default_reps_duration || "12"}
                    </span>
                  </div>
                </div>

                {/* Rest Duration */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Rest Time
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.rest_time_seconds
                        ? `${data.rest_time_seconds.replace(/[^0-0a-zA-Z]/g, "")}s`
                        : "60s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Muscle Groups Badges */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Muscles Involved
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.primary_muscle_group && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-3 py-1"
                    >
                      Primary: {data.primary_muscle_group}
                    </Badge>
                  )}
                  {data.secondary_muscles &&
                    data.secondary_muscles
                      .split(",")
                      .map((m) => m.trim())
                      .filter(Boolean)
                      .map((muscle, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-slate-100 text-slate-600 border-none font-bold uppercase text-[9px] px-3 py-1"
                        >
                          {muscle}
                        </Badge>
                      ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Equipment Needed
                </h4>
                <p className="text-sm text-slate-700 font-semibold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 inline-block">
                  {data.equipment_required || "No equipment needed"}
                </p>
              </div>

              {/* Video Tutorial Hook Component */}
              {data.video_url && (
                <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                      <PlayCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">
                        Video Guide
                      </h4>
                      <p className="text-[10px] font-medium text-blue-500">
                        Watch proper layout execution form
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-blue-200 text-blue-600 bg-white hover:bg-blue-50"
                    asChild
                  >
                    <a
                      href={data.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Watch
                    </a>
                  </Button>
                </div>
              )}
              {/* Description / Instruction Block */}
              {data.description && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />{" "}
                    Description & Instructions
                  </h4>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-2 prose prose-sm max-w-none">
                    {(() => {
                      let parsedDescription = data.description;
                      if (typeof data.description === "string") {
                        try {
                          parsedDescription = JSON.parse(data.description);
                        } catch (e) {
                          // Not JSON, treat as plain text
                        }
                      }

                      if (hasLexicalContent(parsedDescription)) {
                        return (
                          <LexicalRenderer initialState={parsedDescription} />
                        );
                      } else if (typeof parsedDescription === "string") {
                        return <p>{parsedDescription}</p>;
                      } else {
                        return (
                          <div className="text-slate-400 italic text-sm">
                            No description provided.
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
              {/* Benefits / Meta Details (Optional extension) */}
              {data.benefits && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Key Benefits
                  </h4>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    {data.benefits}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-100">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-slate-900/10 transition-all rounded-2xl bg-slate-900 text-white"
                onClick={() => openAdd(data)}
              >
                ✏️ Manage Exercise
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewExerciseDialog;
