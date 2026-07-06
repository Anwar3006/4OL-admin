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
  useViewChallengeDialog,
  useAddChallengeDialog,
} from "@/stores/dialog-store";
import { useChallenge } from "@/hooks/supabase-calls/useChallenge";
import {
  Trophy,
  Calendar,
  Users,
  ShieldCheck,
  Target,
  Layers,
} from "lucide-react";
import { parseISO, format } from "date-fns";

const ViewChallengeDialog = () => {
  const { isOpen, close, entityId } = useViewChallengeDialog();
  const { open: openAdd } = useAddChallengeDialog();
  const { data, isLoading } = useChallenge(entityId!);

  // Helper safely handling Postgres 'YYYY-MM-DD' date string variations without timezone degradation
  const formatDbDate = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), formatStr);
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
        <VisuallyHidden.Root>
          <DialogTitle>Challenge Details</DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading challenge details...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Challenge not found
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header Featured Image Banner */}
            <div className="relative h-64 w-full bg-slate-900">
              <img
                src={data.featured_image_url || "/placeholder-challenge.jpg"}
                alt={data.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />

              {/* Dynamic Status Badges */}
              <div className="absolute top-6 right-6 flex gap-2">
                {!data.is_public && (
                  <Badge className="bg-amber-600 border-none px-3 text-[10px] font-bold">
                    PRIVATE
                  </Badge>
                )}
                <Badge
                  className={
                    data.status === "published"
                      ? "bg-emerald-500 hover:bg-emerald-600 border-none px-4"
                      : "bg-slate-500 border-none px-4"
                  }
                >
                  {(data.status || "draft").toUpperCase()}
                </Badge>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Trophy className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.challenge_type}
                  </span>
                </div>
                <h2
                  className="text-3xl font-black text-white leading-tight"
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  {data.title}
                </h2>
              </div>
            </div>

            {/* Metric Metrics Grid */}
            <div className="p-8 space-y-8 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Timeline
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {formatDbDate(
                        new Date(data.start_date).toISOString().split("T")[0],
                        "MMM d",
                      )}{" "}
                      -{" "}
                      {formatDbDate(
                        new Date(data.end_date).toISOString().split("T")[0],
                        "MMM d, yyyy",
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Goal
                    </span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {data.goal_value
                        ? Number(data.goal_value).toLocaleString()
                        : "Custom"}{" "}
                      {data.goal_metric || ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Context */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Mission Statement
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {data.description ||
                    "No description provided for this challenge."}
                </p>
              </div>

              {/* Incentives / Rewards Box */}
              {data.reward_description && (
                <div className="flex gap-4 p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50">
                  {data.reward_image_url && (
                    <div className="h-16 w-16 min-w-[4rem] rounded-xl overflow-hidden bg-white border border-emerald-200">
                      <img
                        src={data.reward_image_url}
                        alt="Reward Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                      <h4 className="text-sm font-black uppercase tracking-widest">
                        Incentive Reward
                      </h4>
                    </div>
                    <p className="text-sm text-emerald-800 leading-relaxed font-bold">
                      {data.reward_description}
                    </p>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {data.tags && data.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Focus Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[11px] font-medium rounded-md px-2 py-0.5"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Roster Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Roster Slots
                  </h4>
                  <p className="text-sm font-bold text-slate-700">
                    {data.current_participants ?? 0}
                    {data.max_participants
                      ? ` / ${data.max_participants}`
                      : " Users Enrolled"}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Completions
                  </h4>
                  <p className="text-sm font-bold text-slate-700">
                    {data.completion_count ?? 0} Finishes
                  </p>
                </div>
              </div>
            </div>

            {/* Management Trigger */}
            <div className="p-8 bg-white border-t border-slate-100">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-primary/20 transition-all rounded-2xl"
                onClick={() => openAdd(data)}
              >
                ✏️ Manage Challenge
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewChallengeDialog;
