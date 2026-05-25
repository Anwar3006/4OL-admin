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
  useViewChallengeDialog,
  useAddChallengeDialog,
} from "@/stores/dialog-store";
import { useChallenge } from "@/hooks/supabase-calls/useChallenge";
import { Trophy, Calendar, Zap, Users, ShieldCheck, Info, Target } from "lucide-react";
import { format } from "date-fns";

const ViewChallengeDialog = () => {
  const { isOpen, close, entityId } = useViewChallengeDialog();
  const { open: openAdd } = useAddChallengeDialog();
  const { data, isLoading } = useChallenge(entityId!);

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-slate-100 p-0">
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
            <div className="relative h-64 w-full bg-slate-900">
              <img
                src={data.featured_image_url || "/placeholder-challenge.jpg"}
                alt={data.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <div className="absolute top-6 right-6">
                <Badge
                  className={
                    data.status === "active" ? "bg-emerald-500 hover:bg-emerald-600 border-none px-4" : "bg-slate-500 border-none px-4"
                  }
                >
                  {data.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Trophy className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.challenge_type}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
                  {data.title}
                </h2>
              </div>
            </div>

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
                      {format(new Date(data.start_date), "MMM d")} - {format(new Date(data.end_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Goal
                    </span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {data.goal_value.toLocaleString()} {data.goal_metric}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Mission Statement
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {data.description}
                </p>
              </div>

              {data.reward_description && (
                <div className="space-y-4 p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">
                      Incentive
                    </h4>
                  </div>
                  <p className="text-sm text-emerald-800 leading-relaxed font-bold">
                    {data.reward_description}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Current Roster ({data.current_participants})
                </h4>
                <div className="flex flex-wrap gap-2">
                   <p className="text-xs text-slate-400 italic">Participant list integration coming soon...</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-primary/20 transition-all rounded-2xl"
                onClick={() => openAdd(data)}
              >
                Manage Challenge
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewChallengeDialog;
