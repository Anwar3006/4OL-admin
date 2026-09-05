// view-outdoor-review-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useViewOutdoorReviewDialog,
  useAddOutdoorReviewDialog,
} from "@/stores/dialog-store";
import { useFitnessOutdoorReview } from "@/features/fitness/data/useFitnessOutdoor";
import {
  MessageSquare,
  Star,
  User,
  ShieldAlert,
  Flag,
  Calendar,
  Compass,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewOutdoorReviewDialog = () => {
  const { isOpen, close, entityId } = useViewOutdoorReviewDialog();
  const { open: openAdd } = useAddOutdoorReviewDialog();
  const { data, isLoading } = useFitnessOutdoorReview(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  const formatReviewDate = (
    dateStr: Date | string | null | undefined,
  ): string => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const moderationColor =
    data?.moderation_status === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : data?.moderation_status === "pending_review"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.route?.name
              ? `Review for ${data.route.name}`
              : "Route Review"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <LoadingState />
        ) : data ? (
          <DetailView
            data={data}
            onEdit={() => openAdd(data)}
            onDelete={() => setShowDeleteModal(true)}
            onClose={close}
            formatReviewDate={formatReviewDate}
            moderationColor={moderationColor}
          />
        ) : (
          <NotFoundState onClose={close} />
        )}
      </DialogContent>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          close();
        }}
        title="Delete Route Review"
        itemName={data?.route?.name || "Review"}
        itemType="route review"
      />
    </Dialog>
  );
};

/* ───────────────────────────────────────────────────────────
   Loading / Empty States
   ─────────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-white">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
        <div className="relative w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-emerald-600 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Loading Review Data
      </span>
    </div>
  );
}

function NotFoundState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6 bg-white">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
        <Ban className="h-10 w-10 text-slate-300" />
      </div>
      <div className="space-y-2">
        <p className="text-slate-900 font-black text-xl tracking-tight">
          Review Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This review may have been deleted or moved. Please return to the
          directory.
        </p>
      </div>
      <Button
        onClick={onClose}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none px-8 h-12 font-bold uppercase tracking-widest text-[11px] mt-2"
      >
        Close Panel
      </Button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Detail View
   ─────────────────────────────────────────────────────────── */

function DetailView({
  data,
  onEdit,
  onDelete,
  onClose,
  formatReviewDate,
  moderationColor,
}: {
  data: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  formatReviewDate: (dateStr: Date | string | null | undefined) => string;
  moderationColor: string;
}) {
  const fullStars = data.rating || 0;
  const emptyStars = 5 - fullStars;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-none border border-emerald-100">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
              Route Review
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Moderation Panel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data.moderation_status && (
            <Badge
              className={`hidden sm:inline-flex rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border ${moderationColor}`}
            >
              {data.moderation_status.replace("_", " ")}
            </Badge>
          )}

          {data.is_flagged && (
            <Badge className="hidden sm:inline-flex rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-50 text-red-700 border border-red-200">
              <Flag className="h-3 w-3 mr-1" />
              Flagged
            </Badge>
          )}

          <Button
            onClick={onEdit}
            className="rounded-none h-10 px-4 font-bold uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
          </Button>

          <Button
            variant="ghost"
            onClick={onDelete}
            className="rounded-none text-slate-400 hover:text-white hover:bg-red-600 h-10 w-10 p-0 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-none text-slate-400 hover:text-slate-900 hover:bg-slate-100 h-10 w-10 p-0 transition-all md:hidden"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Hero Section */}
        <div className="bg-white border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left: Rating & Meta */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={`rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border ${moderationColor}`}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    {data.moderation_status?.replace("_", " ") || "Pending"}
                  </Badge>
                  {data.is_flagged && (
                    <Badge className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-50 text-red-700 border border-red-200">
                      <Flag className="h-3 w-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: fullStars }).map((_, i) => (
                      <Star
                        key={`full-${i}`}
                        className="h-6 w-6 fill-amber-400 text-amber-400"
                      />
                    ))}
                    {Array.from({ length: emptyStars }).map((_, i) => (
                      <Star
                        key={`empty-${i}`}
                        className="h-6 w-6 text-slate-200"
                      />
                    ))}
                    <span className="ml-2 text-2xl font-black text-slate-900">
                      {data.rating || 0}
                    </span>
                    <span className="text-sm text-slate-400 font-bold">
                      / 5
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Submitted on {formatReviewDate(data.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <MetaPill
                  icon={Compass}
                  label="Reviewed Route"
                  value={data.route?.name || "N/A"}
                />
                <MetaPill
                  icon={User}
                  label="Author"
                  value={
                    data.user
                      ? `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim()
                      : "Anonymous"
                  }
                />
              </div>
            </div>

            {/* Right: Route Info */}
            <div className="lg:col-span-5 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 md:p-10">
              {data.route ? (
                <div className="bg-white p-6 border border-slate-200 rounded-none shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-none">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {data.route.name}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Reviewed Route
                      </p>
                    </div>
                  </div>
                  {data.route.category && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 text-slate-500"
                    >
                      {data.route.category}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="h-[280px] w-full bg-slate-100 flex flex-col items-center justify-center border border-slate-200 rounded-none">
                  <Compass className="h-10 w-10 text-slate-300 mb-3" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    No Route Linked
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Moderation Warning */}
          {data.is_flagged && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-none">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-800 mb-1">
                    Moderation Warning
                  </h4>
                  <p className="text-[14px] text-red-600 leading-relaxed font-medium">
                    This review has been flagged by users or system filters.
                    Review the comment content for violations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <section className="space-y-5">
            <SectionHeader icon={MessageSquare} title="Comment" />
            <div className="bg-white p-6 md:p-8 border border-slate-200 rounded-none shadow-sm">
              {data.comment ? (
                <p className="text-[15px] text-slate-600 leading-[1.7] whitespace-pre-wrap">
                  {data.comment}
                </p>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-none border italic text-sm font-medium bg-slate-50 border-slate-100 text-slate-400">
                  <Ban className="h-4 w-4 opacity-50 shrink-0" />
                  No comment text provided with this rating.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Outdoor Reviews
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              ID: {data.id.slice(0, 8)}…
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Sub-Components
   ─────────────────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-none">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">
        {title}
      </h3>
    </div>
  );
}

function MetaPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default ViewOutdoorReviewDialog;
