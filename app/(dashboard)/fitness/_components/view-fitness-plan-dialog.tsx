"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useViewFitnessPlanDialog,
  useAddFitnessPlanDialog,
} from "@/stores/dialog-store";
import { useFitnessPlan } from "@/hooks/supabase-calls/useFitnessPlan";
import { ClipboardList, Clock, Calendar, BarChart3, Star, Target, ShieldAlert, Tag } from "lucide-react";

const ViewFitnessPlanDialog = () => {
  const { isOpen, close, entityId } = useViewFitnessPlanDialog();
  const { open: openAdd } = useAddFitnessPlanDialog();
  const { data, isLoading } = useFitnessPlan(entityId!);

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-slate-100 p-0 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading fitness plan...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Fitness plan not found
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header Banner Background */}
            <div className="relative h-60 w-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-8 flex flex-col justify-end">
              <div className="absolute top-6 right-6 flex gap-2">
                {data.is_premium && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 border-none px-3 font-bold text-[10px]">
                    PRO
                  </Badge>
                )}
                {data.is_featured && (
                  <Badge className="bg-indigo-500 hover:bg-indigo-600 border-none px-3 flex gap-1 font-bold text-[10px]">
                    <Star className="h-3 w-3 fill-current" /> FEATURED
                  </Badge>
                )}
                <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none px-3 font-bold text-[10px] capitalize">
                  {data.status || "published"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-300">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.difficulty_level || "Intermediate"} Level
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">
                  {data.title}
                </h2>
                {data.author_type && (
                  <span className="inline-block text-[10px] font-medium text-slate-400 capitalize">
                    Created via {data.author_type} Engine
                  </span>
                )}
              </div>
            </div>

            {/* Core Body Fields */}
            <div className="p-8 space-y-8 flex-1">
              
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.duration_weeks} Weeks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.workouts_per_week} Workouts / Wk
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-amber-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-slate-700">
                        {data.average_rating ? Number(data.average_rating).toFixed(1) : "0.0"} ({data.rating_count || 0})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-purple-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Completions</span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.total_completions || 0} users
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Plan Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {data.description || "No description provided for this plan."}
                </p>
              </div>

              {/* Targets Array Section */}
              {data.target_body_parts && data.target_body_parts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Target Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.target_body_parts.map((part: string) => (
                      <Badge key={part} variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold uppercase text-[9px] px-3 py-1">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals Section */}
              {data.goals && data.goals.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Target Goals
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.goals.map((goal: string) => (
                      <Badge key={goal} variant="secondary" className="bg-purple-50 text-purple-600 border-none font-bold uppercase text-[9px] px-3 py-1">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {data.tags && data.tags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Search Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((tag: string) => (
                      <div key={tag} className="inline-flex items-center gap-1 text-slate-400 text-xs bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Action Footer */}
            <div className="p-8 bg-white border-t border-slate-100">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-indigo-900/10 transition-all rounded-2xl bg-slate-900 hover:bg-slate-800 text-white"
                onClick={() => openAdd(data)}
              >
                Manage Fitness Plan
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewFitnessPlanDialog;