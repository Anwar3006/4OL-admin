"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useViewOutdoorEventDialog,
  useAddOutdoorEventDialog,
} from "@/stores/dialog-store";
import { useFitnessOutdoorEvent } from "@/hooks/supabase-calls/useFitnessOutdoor";
import { Calendar, Users, MapPin, Route, Navigation, Compass, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ViewOutdoorEventDialog = () => {
  const { isOpen, close, entityId } = useViewOutdoorEventDialog();
  const { open: openAdd } = useAddOutdoorEventDialog();
  const { data, isLoading } = useFitnessOutdoorEvent(entityId!);

  const formatEventDate = (dateStr: Date | string | null | undefined): string => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-slate-100 p-0 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              Loading event details...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            Event not found
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white">
            
            {/* Header Media Banner */}
            <div className="relative h-48 w-full bg-slate-900 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 to-slate-900 opacity-90" />
              
              <div className="absolute top-6 right-6 flex gap-2">
                <Badge className={cn(
                  "border-none px-4 uppercase text-xs font-bold tracking-wide text-white",
                  data.status === "active" ? "bg-emerald-500" :
                  data.status === "upcoming" ? "bg-blue-500" :
                  data.status === "completed" ? "bg-purple-500" : "bg-slate-500"
                )}>
                  {data.status}
                </Badge>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.category || "Fitness Event"}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">
                  {data.title}
                </h2>
              </div>
            </div>

            {/* Scrollable Content Details */}
            <div className="p-8 space-y-8 flex-1 bg-white">
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Date / Time */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Time</span>
                    <span className="text-xs font-bold text-slate-700">
                      {formatEventDate(data.start_at)}
                    </span>
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Participants</span>
                    <span className="text-xs font-bold text-slate-700">
                      {data.current_participants} / {data.max_participants || "∞"}
                    </span>
                  </div>
                </div>

                {/* Area */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area / Area</span>
                    <span className="text-xs font-bold text-slate-700 truncate capitalize">
                      {data.area || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connected Route Details */}
              {data.route && (
                <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                      <Route className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700">Connected Route</h4>
                      <p className="text-sm font-bold text-emerald-950 mt-0.5">{data.route.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Organiser Info */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Organizer</span>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {data.creator ? `${data.creator.first_name || ""} ${data.creator.last_name || ""}`.trim() : "System Organizer"}
                  </span>
                </div>
              </div>

              {/* GPS Coordinates */}
              {(data.latitude || data.longitude) && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Coordinates (GPS)
                  </h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Compass className="h-3.5 w-3.5 text-slate-400" />
                      Lat: {data.latitude ?? "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Navigation className="h-3.5 w-3.5 text-slate-400" />
                      Lon: {data.longitude ?? "—"}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {data.description && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Event Description
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-emerald-950/10 transition-all rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => openAdd(data)}
              >
                Manage Event
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewOutdoorEventDialog;
