"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useViewOutdoorRouteDialog,
  useAddOutdoorRouteDialog,
} from "@/stores/dialog-store";
import { useFitnessOutdoorRoute } from "@/hooks/supabase-calls/useFitnessOutdoor";
import { MapPin, Navigation, Clock, Activity, Calendar, ShieldCheck, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ViewOutdoorRouteDialog = () => {
  const { isOpen, close, entityId } = useViewOutdoorRouteDialog();
  const { open: openAdd } = useAddOutdoorRouteDialog();
  const { data, isLoading } = useFitnessOutdoorRoute(entityId!);

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-slate-100 p-0 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              Loading route details...
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white">
            Route not found
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white">
            
            {/* Header Media Banner */}
            <div className="relative h-64 w-full bg-slate-900 shrink-0">
              <img
                src={data.image_urls?.[0] || "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1000"}
                alt={data.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              
              <div className="absolute top-6 right-6 flex gap-2">
                <Badge className={cn(
                  "border-none px-4 uppercase text-xs font-bold tracking-wide",
                  data.is_active ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
                )}>
                  {data.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge className={cn(
                  "border-none px-4 text-xs font-bold tracking-wide",
                  data.verification_status === "approved" ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                )}>
                  {data.verification_status.replace("_", " ")}
                </Badge>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {data.category || "General Trail"}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">
                  {data.name}
                </h2>
              </div>
            </div>

            {/* Scrollable Content Details */}
            <div className="p-8 space-y-8 flex-1 bg-white">
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Distance */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {data.distance_km ? `${data.distance_km} km` : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Duration</span>
                    <span className="text-xs font-bold text-slate-700 capitalize mt-0.5">
                      {data.estimated_duration_mins ? `${data.estimated_duration_mins} mins` : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</span>
                    <span className="text-xs font-bold text-slate-700 capitalize mt-0.5">
                      {data.difficulty || "low"}
                    </span>
                  </div>
                </div>

                {/* Surface Type */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Surface</span>
                    <span className="text-xs font-bold text-slate-700 capitalize mt-0.5">
                      {data.surface_type || "Natural"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Start Location */}
              {data.start_location_name && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Start Location
                  </h4>
                  <p className="text-xs text-slate-700 font-bold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {data.start_location_name}
                  </p>
                </div>
              )}

              {/* Creator & Verifier Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Created By</span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {data.creator ? `${data.creator.first_name || ""} ${data.creator.last_name || ""}`.trim() : "System"}
                    </span>
                  </div>
                </div>

                {data.verified_by && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Verified By</span>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {data.verifier ? `${data.verifier.first_name || ""} ${data.verifier.last_name || ""}`.trim() : "Admin"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {data.description && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Route Description
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>
              )}

              {/* Route Gallery Images */}
              {data.image_urls && data.image_urls.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Route Gallery ({data.image_urls.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.image_urls.map((url, i) => (
                      <div key={i} className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <Button
                className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-xl hover:shadow-emerald-950/10 transition-all rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => openAdd(data)}
              >
                Manage Route
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewOutdoorRouteDialog;
