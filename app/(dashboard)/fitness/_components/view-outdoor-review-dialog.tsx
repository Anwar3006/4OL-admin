"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useViewOutdoorReviewDialog,
  useAddOutdoorReviewDialog,
} from "@/stores/dialog-store";
import { useFitnessOutdoorReview } from "@/hooks/supabase-calls/useFitnessOutdoor";
import { MessageSquare, Star, User, ShieldAlert, Flag, Calendar, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const ViewOutdoorReviewDialog = () => {
  const { isOpen, close, entityId } = useViewOutdoorReviewDialog();
  const { open: openAdd } = useAddOutdoorReviewDialog();
  const { data, isLoading } = useFitnessOutdoorReview(entityId!);

  const formatReviewDate = (dateStr: Date | string | null | undefined): string => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-slate-100 p-0 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              Loading review details...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            Review not found
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white">
            
            {/* Header Media Banner */}
            <div className="p-8 bg-slate-900 text-white shrink-0 relative overflow-hidden">
              <div className="absolute right-4 bottom-0 opacity-10 translate-y-4">
                <MessageSquare className="h-36 w-36" />
              </div>
              
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-1 text-ek-gold text-lg">
                  {"⭐".repeat(data.rating || 5)}
                  <span className="text-slate-700">{"⭐".repeat(5 - (data.rating || 5))}</span>
                </div>
                <div className="flex gap-2">
                  {data.is_flagged && (
                    <Badge className="bg-red-500 hover:bg-red-600 border-none px-3 py-1 flex items-center gap-1 text-[10px] uppercase font-black text-white">
                      <Flag className="h-3 w-3 fill-current" /> FLAGGED
                    </Badge>
                  )}
                  <Badge className={cn(
                    "border-none px-3 py-1 text-[10px] uppercase font-black text-white",
                    data.moderation_status === "approved" ? "bg-emerald-500" :
                    data.moderation_status === "pending_review" ? "bg-amber-500" : "bg-red-500"
                  )}>
                    {data.moderation_status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl font-black leading-tight text-white">
                  Route Review Profile
                </h2>
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Submitted on {formatReviewDate(data.created_at)}
                </p>
              </div>
            </div>

            {/* Scrollable Content Details */}
            <div className="p-8 space-y-8 flex-1 bg-white">
              
              {/* Linked Route */}
              {data.route && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reviewed Route</span>
                      <span className="text-xs font-bold text-slate-700">{data.route.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Author Profile */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Author Profile
                </h4>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-500">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">App User</span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.user ? `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() : "Anonymous User"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Moderation Warnings */}
              {data.is_flagged && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">Moderation Warning</h4>
                    <p className="text-[11px] text-red-600 leading-normal">
                      This review has been flagged by users or system filters. Review the comment content for violations.
                    </p>
                  </div>
                </div>
              )}

              {/* Comment text */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Comment Text
                </h4>
                <div className="p-5 rounded-2xl border border-slate-150 bg-slate-50/50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {data.comment || <span className="text-slate-400 italic">No comment text provided with rating.</span>}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-emerald-950/10 transition-all rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => openAdd(data)}
              >
                Moderate Review
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewOutdoorReviewDialog;
