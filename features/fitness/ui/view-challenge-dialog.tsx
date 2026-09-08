// view-challenge-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useViewChallengeDialog, useAddChallengeDialog } from "@/features/fitness/data/dialog-hooks";
import { useChallenge } from "@/features/fitness/data/useChallenge";
import {
  Trophy,
  Calendar,
  Users,
  ShieldCheck,
  Target,
  Layers,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  Ban,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { parseISO, format } from "date-fns";
import { getPublicImageUrl } from "@/lib/utils";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { TopRatedToggle } from "@/components/redesign/TopRatedToggle";

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewChallengeDialog = () => {
  const { isOpen, close, entityId } = useViewChallengeDialog();
  const { open: openAdd } = useAddChallengeDialog();
  const { data, isLoading } = useChallenge(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Guard against empty / null image URLs
  const rawImage = data?.featured_image_url;
  const images =
    typeof rawImage === "string" && rawImage.trim().length > 0
      ? [rawImage]
      : [];

  // Helper safely handling Postgres date strings
  const formatDbDate = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), formatStr);
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.title ? `Details for ${data.title}` : "Challenge Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <LoadingState />
        ) : data ? (
          <DetailView
            data={data}
            images={images}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
            onEdit={() => openAdd(data)}
            onDelete={() => setShowDeleteModal(true)}
            onClose={close}
            formatDbDate={formatDbDate}
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
        title="Delete Challenge"
        itemName={data?.title || ""}
        itemType="challenge"
      />
    </Dialog>
  );
};

/* ───────────────────────────────────────────────────────────
   Loading / Empty States
   ─────────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-white dark:bg-slate-800">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-500/20 rounded-full animate-ping opacity-50" />
        <div className="relative w-16 h-16 bg-emerald-50 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
          <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Loading Challenge Data
      </span>
    </div>
  );
}

function NotFoundState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6 bg-white dark:bg-slate-800">
      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800">
        <Ban className="h-10 w-10 text-slate-300" />
      </div>
      <div className="space-y-2">
        <p className="text-slate-900 dark:text-slate-100 font-black text-xl tracking-tight">
          Challenge Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This challenge record may have been deleted or moved. Please return to
          the directory.
        </p>
      </div>
      <Button
        onClick={onClose}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none px-8 h-12 font-bold uppercase tracking-widest text-xs mt-2"
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
  images,
  activeImage,
  onSelectImage,
  onEdit,
  onDelete,
  onClose,
  formatDbDate,
}: {
  data: any;
  images: string[];
  activeImage: number;
  onSelectImage: (i: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  formatDbDate: (dateString: string | undefined, formatStr: string) => string;
}) {
  const currentImageSrc = images[activeImage]
    ? getPublicImageUrl(images[activeImage])
    : "";

  const startDate = formatDbDate(
    new Date(data.start_date).toISOString().split("T")[0],
    "MMM d, yyyy",
  );
  const endDate = formatDbDate(
    new Date(data.end_date).toISOString().split("T")[0],
    "MMM d, yyyy",
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 dark:bg-emerald-500/15 rounded-none border border-emerald-100 dark:border-emerald-500/30">
            <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {data.title}
            </h2>
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Challenge Reference
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data.status && (
            <Badge
              className={`hidden sm:inline-flex rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 ${
                data.status === "published"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200"
                  : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200"
              }`}
            >
              {data.status}
            </Badge>
          )}

          {!data.is_public && (
            <Badge className="hidden sm:inline-flex rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Private
            </Badge>
          )}

          <TopRatedToggle
            compact
            module="challenge"
            itemId={data.id}
            title={data.title}
            subtitle={data.challenge_type}
            imageUrl={data.featured_image_url}
          />

          <Button
            onClick={onEdit}
            className="rounded-none h-10 px-4 font-bold uppercase tracking-widest text-2xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
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
            className="rounded-none text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10 p-0 transition-all md:hidden"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left: Meta & Stats */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-none">
                    <Trophy className="h-3 w-3 mr-1.5" />
                    {data.challenge_type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 dark:border-slate-700 text-slate-500"
                  >
                    {data.goal_metric || "Custom Goal"}
                  </Badge>
                </div>

                <DialogTitle className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                  {data.title}
                </DialogTitle>

                {data.description && (
                  <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {data.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <MetaPill
                  icon={Calendar}
                  label="Start Date"
                  value={startDate}
                />
                <MetaPill icon={Calendar} label="End Date" value={endDate} />
                <MetaPill
                  icon={Users}
                  label="Participants"
                  value={`${data.current_participants ?? 0}${data.max_participants ? ` / ${data.max_participants}` : ""}`}
                />
                <MetaPill
                  icon={CheckCircle2}
                  label="Completions"
                  value={`${data.completion_count ?? 0}`}
                />
              </div>
            </div>

            {/* Right: Image */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 p-6 md:p-10">
              {images.length > 0 ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden group">
                    {currentImageSrc ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeImage}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          // className="absolute inset-0"
                        >
                          <Image
                            src={currentImageSrc}
                            alt={data.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 500px"
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-slate-400">
                          Invalid image URL
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 rounded-none">
                  <Trophy className="h-10 w-10 text-slate-300 mb-3" />
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
                    No Cover Image
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Goal */}
          {data.goal_value && (
            <div className="bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 p-6 rounded-none flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-none">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                    Target Goal
                  </h4>
                  <p className="text-2xs font-medium text-emerald-600 dark:text-emerald-400">
                    {data.goal_metric || "Custom metric"}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {Number(data.goal_value).toLocaleString()}
              </span>
            </div>
          )}

          {/* Reward */}
          {data.reward_description && (
            <section className="space-y-5">
              <SectionHeader icon={ShieldCheck} title="Incentive Reward" />
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm">
                <div className="flex items-start gap-4">
                  {data.reward_image_url && (
                    <div className="relative w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden">
                      <Image
                        src={getPublicImageUrl(data.reward_image_url)}
                        alt="Reward"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {data.reward_description}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <section className="space-y-5">
              <SectionHeader icon={Layers} title="Focus Tags" />
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 dark:border-slate-700 text-slate-500"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-2xs font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Fitness Database
              </span>
            </div>
            <p className="text-2xs font-medium text-slate-400 uppercase tracking-widest">
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
      <div className="p-2 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-none">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="section-heading">
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
        <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

export default ViewChallengeDialog;
