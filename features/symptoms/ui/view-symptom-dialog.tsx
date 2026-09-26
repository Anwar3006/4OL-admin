"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getPublicImageUrl, hasLexicalContent } from "@/lib/utils";
import { useAddConditionDialog, useViewConditionDialog } from "@/features/diseases/data/dialog-hooks";
import { TSymptomsOutput } from "@/features/symptoms/schema/types";

import {
  AlertTriangle,
  Ban,
  Calendar,
  Dna,
  ExternalLink,
  Info,
  LayoutGrid,
  ShieldCheck,
  Stethoscope,
  Syringe,
  User,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  FolderOpen,
} from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useDeleteSymptom,
  useSymptom,
} from "@/features/symptoms/data/useSymptoms";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const LexicalRenderer = dynamic(
  () =>
    import("@/components/LexicalRenderer").then((mod) => mod.LexicalRenderer),
  { ssr: false },
);

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewSymptomDialog = () => {
  const { isOpen, entityId, close } = useViewConditionDialog();
  const addDialog = useAddConditionDialog();

  const { data, isLoading } = useSymptom(entityId!);
  const { mutateAsync: deleteSymptom } = useDeleteSymptom();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Guard against empty / null image URLs
  const rawImage = data?.image_url;
  const images =
    typeof rawImage === "string" && rawImage.trim().length > 0
      ? [rawImage]
      : [];

  if (!isOpen) return null;

  const handleEdit = () => {
    close();
    addDialog.open(data as TSymptomsOutput);
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleDeleteConfirm = async () => {
    await deleteSymptom(entityId!);
    setShowDeleteModal(false);
    close();
  };

  const handleDeleteCancel = () => setShowDeleteModal(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.name ? `Details for ${data.name}` : "Symptom Details"}
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
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onClose={close}
          />
        ) : (
          <NotFoundState onClose={close} />
        )}
      </DialogContent>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Symptom"
        itemName={data?.name || ""}
        itemType="symptom"
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
          <HeartPulse className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Retrieving Symptom Data
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
          Record Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This symptom record may have been deleted or moved. Please return to
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
  data: TSymptomsOutput;
  images: string[];
  activeImage: number;
  onSelectImage: (i: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const hasTypes = data.symptomTypes && data.symptomTypes.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 dark:bg-emerald-500/15 rounded-none border border-emerald-100 dark:border-emerald-500/30">
            <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {data.name}
            </h2>
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Symptom Reference Record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onEdit}
            className="rounded-none h-10 px-4 font-bold uppercase tracking-widest text-2xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
          </Button>

          {data?.nhsLink && (
            <Button
              variant="outline"
              className="rounded-none border-slate-200 dark:border-slate-700 h-10 px-4 font-bold uppercase tracking-widest text-2xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-emerald-200 transition-all hidden sm:inline-flex"
              asChild
            >
              <a href={data.nhsLink} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                NHS
              </a>
            </Button>
          )}

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
            {/* Left: Meta & Classification */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {data?.isSystemic ? (
                    <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-none">
                      <Dna className="h-3 w-3 mr-1.5" /> Systemic Symptom
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black uppercase text-2xs tracking-widest px-3 py-1.5 rounded-none">
                      Localized
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                  {data.name}
                </DialogTitle>

                {data.bodyParts && data.bodyParts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.bodyParts.map((bp: any) => (
                      <span
                        key={bp.body_parts?.id ?? bp.id ?? Math.random()}
                        className="inline-flex items-center px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-2xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 rounded-none"
                      >
                        {bp.body_parts?.name ?? bp.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <MetaPill
                  icon={User}
                  label="Specialist"
                  value={data.specialist || "General Practitioner"}
                />
                <MetaPill
                  icon={Calendar}
                  label="Last Updated"
                  value={new Date(data.updated_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                />
                <MetaPill
                  icon={Dna}
                  label="Systemic"
                  value={data.isSystemic ? "Yes" : "No"}
                />
              </div>
            </div>

            {/* Right: Image Gallery */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 p-6 md:p-10">
              <ImageGallery
                images={images}
                name={data.name}
                activeIndex={activeImage}
                onSelect={onSelectImage}
              />
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Overview */}
          <ContentBlock
            icon={Info}
            title="Overview & Description"
            content={data?.about}
            accent="emerald"
          />

          {/* Diagnosis & Treatment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentBlock
              icon={Stethoscope}
              title="Clinical Diagnosis"
              content={data?.diagnosis}
              accent="emerald"
            />
            <ContentBlock
              icon={Syringe}
              title="Care & Treatment"
              content={data?.treatment}
              accent="emerald"
            />
          </div>

          {/* Complications - Dark */}
          <ContentBlock
            icon={AlertTriangle}
            title="Critical Complications"
            content={data?.complications}
            variant="dark"
            accent="emerald"
          />

          {/* Prevention */}
          <ContentBlock
            icon={ShieldCheck}
            title="Prevention Strategy"
            content={data?.prevention}
            accent="emerald"
          />

          {/* Clinical Variants */}
          {hasTypes && (
            <section className="space-y-5">
              <SectionHeader icon={LayoutGrid} title="Clinical Variants" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.symptomTypes!.map((type: any, i: number) => (
                  <div
                    key={type.id ?? i}
                    className="bg-white dark:bg-slate-800 p-6 md:p-8 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm hover:border-emerald-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center rounded-none">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-lg tracking-tight">
                        {type.typeName}
                      </h4>
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      <LexicalRenderer initialState={type.aboutType} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Attribution */}
          {hasLexicalContent(data?.attribution) && (
            <ContentBlock
              icon={User}
              title="Medical Attribution"
              content={data?.attribution}
              accent="emerald"
              compact
            />
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-2xs font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Reference Database
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
  const isEmpty = !hasLexicalContent(content);
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
            <LexicalRenderer initialState={content} />
          ) : (
            <div
              className={`flex items-center gap-3 p-4 rounded-none border italic text-sm font-medium ${isDark ? "bg-white/5 dark:bg-slate-800/5 border-white/10 text-slate-500" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"}`}
            >
              <Ban className="h-4 w-4 opacity-50 shrink-0" />
              No clinical data provided for this section.
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

function ImageGallery({
  images,
  name,
  activeIndex,
  onSelect,
}: {
  images: string[];
  name: string;
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  if (!images || images.length === 0) {
    return (
      <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 rounded-none">
        <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
        <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
          No Visual Reference
        </span>
      </div>
    );
  }

  const currentSrc = getPublicImageUrl(images[activeIndex]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden group">
        {currentSrc ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={currentSrc}
                alt={`${name} reference ${activeIndex + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 500px"
                priority
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-slate-400">Invalid image URL</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 text-2xs font-black text-white tracking-widest rounded-none">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((img, i) => {
            const thumbSrc = getPublicImageUrl(img);
            if (!thumbSrc) return null;
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className={`relative w-16 h-16 shrink-0 border-2 overflow-hidden rounded-none transition-all ${activeIndex === i ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
              >
                <Image
                  src={thumbSrc}
                  alt={`${name} thumb ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(ViewSymptomDialog);
