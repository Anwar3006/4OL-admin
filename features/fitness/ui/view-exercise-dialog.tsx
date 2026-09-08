// view-exercise-dialog.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useViewExerciseDialog, useAddExerciseDialog } from "@/features/fitness/data/dialog-hooks";
import { useExercise } from "@/features/fitness/data/useExercise";
import { hasLexicalContent, getPublicImageUrl } from "@/lib/utils";
import {
  Dumbbell,
  Target,
  Layers,
  Timer,
  Star,
  PlayCircle,
  BookOpen,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  Ban,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { TopRatedToggle } from "@/components/redesign/TopRatedToggle";

const LexicalRenderer = dynamic(
  () =>
    import("@/components/LexicalRenderer").then((mod) => mod.LexicalRenderer),
  { ssr: false },
);

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewExerciseDialog = () => {
  const { isOpen, close, entityId } = useViewExerciseDialog();
  const { open: openAdd } = useAddExerciseDialog();
  const { data, isLoading } = useExercise(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Guard against empty / null image URLs
  const rawImage = data?.thumbnail_url;
  const images =
    typeof rawImage === "string" && rawImage.trim().length > 0
      ? [rawImage]
      : [];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.exercise_name
              ? `Details for ${data.exercise_name}`
              : "Exercise Details"}
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
        title="Delete Exercise"
        itemName={data?.exercise_name || ""}
        itemType="exercise"
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
          <Dumbbell className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Loading Exercise Data
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
          Exercise Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This exercise record may have been deleted or moved. Please return to
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
}: {
  data: any;
  images: string[];
  activeImage: number;
  onSelectImage: (i: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const currentImageSrc = images[activeImage]
    ? getPublicImageUrl(images[activeImage])
    : "";

  const secondaryMuscles = data.secondary_muscles
    ? data.secondary_muscles
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean)
    : [];

  // Parse description for lexical or plain text
  let parsedDescription = data.description;
  if (typeof data.description === "string") {
    try {
      parsedDescription = JSON.parse(data.description);
    } catch {
      // Not JSON, keep as string
    }
  }

  const hasDescription =
    hasLexicalContent(parsedDescription) ||
    (typeof parsedDescription === "string" && parsedDescription.length > 0);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 dark:bg-emerald-500/15 rounded-none border border-emerald-100 dark:border-emerald-500/30">
            <Dumbbell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {data.exercise_name}
            </h2>
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Exercise Reference
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

          {data.is_featured && (
            <Badge className="hidden sm:inline-flex rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200">
              <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
              Featured
            </Badge>
          )}

          <TopRatedToggle
            compact
            module="exercise"
            itemId={data.id}
            title={data.exercise_name}
            subtitle={data.category}
            imageUrl={data.thumbnail_url}
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
                    <Target className="h-3 w-3 mr-1.5" />
                    {data.category || "General Fitness"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 dark:border-slate-700 text-slate-500"
                  >
                    {data.tier === "pro" ? "Pro" : "Free"}
                  </Badge>
                </div>

                <DialogTitle className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                  {data.exercise_name}
                </DialogTitle>

                {data.primary_muscle_group && (
                  <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Primary target:{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {data.primary_muscle_group}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <MetaPill
                  icon={Layers}
                  label="Difficulty"
                  value={data.difficulty_level || "Beginner"}
                />
                <MetaPill
                  icon={Timer}
                  label="Sets × Reps"
                  value={`${data.default_sets || "3"} × ${data.default_reps_duration || "12"}`}
                />
                <MetaPill
                  icon={Timer}
                  label="Rest"
                  value={
                    data.rest_time_seconds
                      ? `${data.rest_time_seconds.replace(/[^0-9]/g, "")}s`
                      : "60s"
                  }
                />
                <MetaPill
                  icon={Dumbbell}
                  label="Equipment"
                  value={data.equipment_required || "None"}
                />
              </div>
            </div>

            {/* Right: Image / Video */}
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
                            alt={data.exercise_name}
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
              ) : data.video_url ? (
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <a
                      href={data.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-3 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <PlayCircle className="h-12 w-12" />
                      <span className="text-2xs font-black uppercase tracking-widest">
                        Watch Video Guide
                      </span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 rounded-none">
                  <Dumbbell className="h-10 w-10 text-slate-300 mb-3" />
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
                    No Visual Reference
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Muscle Groups */}
          {(data.primary_muscle_group || secondaryMuscles.length > 0) && (
            <section className="space-y-5">
              <SectionHeader icon={Target} title="Muscle Groups" />
              <div className="flex flex-wrap gap-2">
                {data.primary_muscle_group && (
                  <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-none">
                    Primary: {data.primary_muscle_group}
                  </Badge>
                )}
                {secondaryMuscles.map((muscle: string, i: number) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="rounded-none text-2xs font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 dark:border-slate-700 text-slate-500"
                  >
                    {muscle}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Description */}
          {hasDescription && (
            <ContentBlock
              icon={BookOpen}
              title="Description & Instructions"
              content={parsedDescription}
              accent="emerald"
            />
          )}

          {/* Benefits */}
          {data.benefits && (
            <ContentBlock
              icon={Star}
              title="Key Benefits"
              content={data.benefits}
              accent="emerald"
              compact
            />
          )}

          {/* Video Link */}
          {data.video_url && (
            <div className="bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 p-6 rounded-none flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-none">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                    Video Tutorial
                  </h4>
                  <p className="text-2xs font-medium text-emerald-600 dark:text-emerald-400">
                    Watch proper form and execution
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-none border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 font-bold uppercase tracking-widest text-2xs"
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

function ContentBlock({
  icon: Icon,
  title,
  content,
  variant = "light",
  accent = "emerald",
  compact = false,
}: {
  icon: React.ElementType;
  title: string;
  content: any;
  variant?: "light" | "dark";
  accent?: "emerald";
  compact?: boolean;
}) {
  const isEmpty =
    !hasLexicalContent(content) &&
    !(typeof content === "string" && content.length > 0);
  const isDark = variant === "dark";

  return (
    <div
      className={`${isDark ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"} 
        ${compact ? "p-6" : "p-6 md:p-8"} 
        border border-slate-200 rounded-none shadow-sm relative overflow-hidden`}
    >
      {isDark && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      )}

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-none ${isDark ? "bg-white/10 dark:bg-slate-800/10 text-emerald-400" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h3
            className={`font-black uppercase tracking-[0.15em] ${compact ? "text-xs" : "text-sm"} ${isDark ? "text-white" : "text-slate-900 dark:text-slate-100"}`}
          >
            {title}
          </h3>
        </div>

        <div
          className={`${isDark ? "text-slate-300" : "text-slate-600 dark:text-slate-300"} text-base leading-[1.7] ${compact ? "" : "md:pl-[3.25rem]"}`}
        >
          {!isEmpty ? (
            typeof content === "string" ? (
              <p>{content}</p>
            ) : (
              <LexicalRenderer initialState={content} />
            )
          ) : (
            <div
              className={`flex items-center gap-3 p-4 rounded-none border italic text-sm font-medium ${isDark ? "bg-white/5 dark:bg-slate-800/5 border-white/10 text-slate-500" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"}`}
            >
              <Ban className="h-4 w-4 opacity-50 shrink-0" />
              No data provided for this section.
            </div>
          )}
        </div>
      </div>
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

export default ViewExerciseDialog;
