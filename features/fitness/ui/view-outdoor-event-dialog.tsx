"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useViewOutdoorEventDialog, useAddOutdoorEventDialog } from "@/features/fitness/data/dialog-hooks";
import { useFitnessOutdoorEvent } from "@/features/fitness/data/useFitnessOutdoor";
import {
  Calendar,
  Users,
  MapPin,
  Route as RouteIcon,
  Navigation,
  Compass,
  Clock,
  Pencil,
  Trash2,
  X,
  Ban,
  Target,
  Globe,
} from "lucide-react";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { TopRatedToggle } from "@/components/redesign/TopRatedToggle";

export function ViewOutdoorEventDialog() {
  const { isOpen, close, entityId } = useViewOutdoorEventDialog();
  const { open: openAdd } = useAddOutdoorEventDialog();
  const { data, isLoading } = useFitnessOutdoorEvent(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  const formatEventDate = (
    dateStr: Date | string | null | undefined,
  ): string => {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-4xl p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl rounded-none max-h-[90vh] overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.title ? `Details for ${data.title}` : "Event Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-white dark:bg-slate-800">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-500/20 rounded-full animate-ping opacity-50" />
              <div className="relative w-16 h-16 bg-emerald-50 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
            </div>
            <span className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest">
              Retrieving Event Details...
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
            formatEventDate={formatEventDate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-5 bg-white dark:bg-slate-800 min-h-[400px]">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300">
              <Ban className="h-10 w-10" />
            </div>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">Event Not Found</p>
            <p className="text-slate-500 font-medium max-w-sm">
              This event may have been removed or updated. Please return to the
              schedule.
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
        title="Delete Outdoor Event"
        itemName={data?.title || ""}
        itemType="outdoor event"
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
  formatEventDate,
}: {
  data: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  formatEventDate: (dateStr: Date | string | null | undefined) => string;
}) {
  const statusColors = {
    active: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-none hover:bg-emerald-200",
    upcoming: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border-none hover:bg-blue-200",
    completed: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none hover:bg-slate-200",
  };

  const currentStatus = (
    data.status || "upcoming"
  ).toLowerCase() as keyof typeof statusColors;
  const statusBadgeClass = statusColors[currentStatus] || statusColors.upcoming;

  // Capacity Math
  const currentParticipants = data.current_participants ?? 0;
  const maxParticipants = data.max_participants ?? 0;
  const spotsLeft = maxParticipants - currentParticipants;
  const fillPercentage =
    maxParticipants > 0
      ? Math.min((currentParticipants / maxParticipants) * 100, 100)
      : 0;

  return (
    <>
      {/* ── Sticky Top Bar Header ── */}
      <div className="bg-white dark:bg-slate-800 sticky top-0 z-30 px-6 py-6 md:px-10 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600 text-white font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm">
                <Target className="h-3 w-3 mr-1.5" />{" "}
                {data.category || "Outdoor Activity"}
              </Badge>
              <Badge
                className={`font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-lg shadow-sm ${statusBadgeClass}`}
              >
                {data.status || "Upcoming"}
              </Badge>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-black leading-tight">
              {data.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto pt-2 md:pt-0">
            <TopRatedToggle
              compact
              module="outdoor_event"
              itemId={data.id}
              title={data.title}
              subtitle={data.category}
            />

            <Button
              onClick={onEdit}
              className="flex-1 md:flex-none rounded-xl shadow-lg shadow-emerald-600/20 px-6 h-11 font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Event
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
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="section-heading">
                  Event Description
                </h3>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {data.description || "No event description provided."}
              </p>
            </div>

            {/* Geography & Routing Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="section-heading">
                  Location & Geography
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Area Region
                  </span>
                  <span className="text-sm font-bold text-black flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {data.area || "Unspecified Area"}
                  </span>
                </div>

                {data.route_id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Assigned Route
                    </span>
                    <span className="text-sm font-bold text-black flex items-center gap-1.5">
                      <RouteIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Linked Route Details
                    </span>
                  </div>
                )}
              </div>

              {/* Coordinates Section */}
              {(data.latitude !== null || data.longitude !== null) && (
                <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-slate-400" />
                    <div>
                      <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block">
                        Geo Coordinates
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        Lat: {data.latitude ?? "N/A"}, Lon:{" "}
                        {data.longitude ?? "N/A"}
                      </span>
                    </div>
                  </div>
                  {data.latitude && data.longitude && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Maps
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Execution Widgets */}
          <div className="lg:col-span-5 space-y-6">
            {/* Start Time Schedule Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xs font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                  Scheduled Start
                </span>
                <p className="text-sm font-black text-black leading-tight">
                  {formatEventDate(data.start_at)}
                </p>
              </div>
            </div>

            {/* Premium Black Tracker Bento for Attendance Capacity */}
            <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-900/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 rounded-xl bg-white/10 dark:bg-slate-800/10 text-emerald-400">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-black uppercase tracking-[0.15em] text-sm text-white">
                  Capacity Tracker
                </h3>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-black tracking-tight text-white">
                    {currentParticipants}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    of{" "}
                    {maxParticipants > 0
                      ? `${maxParticipants} max spots`
                      : "unlimited spots"}
                  </span>
                </div>

                {maxParticipants > 0 && (
                  <>
                    <div className="w-full bg-white/10 dark:bg-slate-800/10 h-2.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-400 pt-1">
                      {spotsLeft > 0
                        ? `${spotsLeft} registration spots remaining`
                        : "This event is currently fully booked."}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Audit Logs Meta Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-2 gap-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-3xs font-black uppercase tracking-widest text-slate-400 block">
                  Date Created
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {new Date(data.created_at).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
              <div className="text-center sm:text-left space-y-1 border-l border-slate-100 dark:border-slate-800 pl-4">
                <span className="text-3xs font-black uppercase tracking-widest text-slate-400 block">
                  Last Updated
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {new Date(data.updated_at).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
