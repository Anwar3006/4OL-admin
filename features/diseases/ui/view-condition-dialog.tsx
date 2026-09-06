"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  Info,
  Syringe,
  ShieldCheck,
  Dna,
  Ban,
  Calendar,
  User,
  LayoutGrid,
  Flame,
  BookOpen,
  Phone,
  Star,
  Pencil,
  Trash2,
  ExternalLink,
  HeartPulse,
  X,
} from "lucide-react";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { hasLexicalContent, getPublicImageUrl } from "@/lib/utils";
import { useCondition } from "@/features/diseases/data/useCondition";
import { useDeleteConditionApi } from "@/features/diseases/data/useDiseasesApi";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const LexicalRenderer = dynamic(
  () =>
    import("@/components/LexicalRenderer").then((mod) => mod.LexicalRenderer),
  { ssr: false },
);

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */

interface ConditionType {
  type_name: string;
  about_type: any;
}

interface ConditionCause {
  cause_name?: string;
  other_possible_causes?: any;
}

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

export function ViewConditionDialog() {
  const { isOpen, entityId, close } = useViewConditionDialog();
  const addDialog = useAddConditionDialog();

  const { data: condition, isLoading } = useCondition({
    id: entityId!,
    enabled: isOpen && !!entityId,
  });

  const { mutateAsync: deleteCondition } = useDeleteConditionApi();

  // ── Filter out empty / null / undefined URLs so src is never "" ──
  const rawImages = Array.isArray(condition?.image_url)
    ? condition.image_url
    : condition?.image_url
      ? [condition.image_url]
      : [];

  const images = rawImages.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  console.log("Condition:", condition);

  if (!isOpen) return null;

  const handleEdit = () => {
    close();
    addDialog.open(condition as any);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteCondition({ id: condition?.id!, imagePaths: images });
    setShowDeleteModal(false);
    close();
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {condition?.name
              ? `Details for ${condition.name}`
              : "Condition Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <LoadingState />
        ) : condition ? (
          <ConditionDetailView
            condition={condition}
            images={images}
            onEdit={handleEdit}
            onDeleteClick={handleDeleteClick}
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
        title="Delete Condition"
        itemName={condition?.name || ""}
        itemType="condition"
      />
    </Dialog>
  );
}

/* ───────────────────────────────────────────────────────────
   Loading / Empty States
   ─────────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-white">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
        <div className="relative w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
          <HeartPulse className="h-8 w-8 text-emerald-600 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Retrieving Clinical Data
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
          Record Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This condition record may have been deleted or moved. Please return to
          the directory.
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
   Condition Detail View
   ─────────────────────────────────────────────────────────── */

function ConditionDetailView({
  condition,
  images,
  onEdit,
  onDeleteClick,
  onClose,
}: {
  condition: any;
  images: string[];
  onEdit: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
}) {
  const [activeImage, setActiveImage] = useState(0);

  const hasTypes = condition.types && condition.types.length > 0;
  const hasCauses = condition.causes && condition.causes.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-none border border-emerald-100">
            <HeartPulse className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
              {condition.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Clinical Reference Record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onEdit}
            className="rounded-none h-10 px-4 font-bold uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
          </Button>

          {condition?.nhs_link && (
            <Button
              variant="outline"
              className="rounded-none border-slate-200 h-10 px-4 font-bold uppercase tracking-widest text-[10px] text-slate-700 hover:bg-slate-50 hover:border-emerald-200 transition-all hidden sm:inline-flex"
              asChild
            >
              <a href={condition.nhs_link} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                NHS
              </a>
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onDeleteClick}
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

      {/* ── Scrollable Body (min-h-0 is critical for flex scroll) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Hero Section */}
        <div className="bg-white border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left: Meta & Classification */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {condition?.is_systemic ? (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-none">
                      <Dna className="h-3 w-3 mr-1.5" /> Systemic Condition
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-none">
                      Localized
                    </Badge>
                  )}
                  {condition.status && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 text-slate-500"
                    >
                      {condition.status}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  {condition.name}
                </DialogTitle>

                {condition.bodyParts && condition.bodyParts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {condition.bodyParts.map((bp: any) => (
                      <span
                        key={bp.body_parts.id}
                        className="inline-flex items-center px-3 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-600 rounded-none"
                      >
                        {bp.body_parts.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <MetaPill
                  icon={User}
                  label="Specialist"
                  value={condition.specialist || "General Practitioner"}
                />
                <MetaPill
                  icon={Calendar}
                  label="Last Updated"
                  value={new Date(condition.updated_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                />
                <MetaPill
                  icon={Activity}
                  label="Systemic"
                  value={condition.is_systemic ? "Yes" : "No"}
                />
              </div>
            </div>

            {/* Right: Image Gallery */}
            <div className="lg:col-span-5 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 md:p-10">
              <ImageGallery
                images={images}
                name={condition.name}
                activeIndex={activeImage}
                onSelect={setActiveImage}
              />
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Overview */}
          <ContentBlock
            icon={Info}
            title="Clinical Overview"
            content={condition?.about}
            accent="emerald"
          />

          {/* Classification & Types */}
          {hasTypes && (
            <section className="space-y-5">
              <SectionHeader icon={LayoutGrid} title="Classification & Types" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {condition.types.map((type: ConditionType) => (
                  <div
                    key={type.type_name}
                    className="bg-white p-6 md:p-8 border border-slate-200 rounded-none shadow-sm hover:border-emerald-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 flex items-center justify-center rounded-none">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <h4 className="font-black text-slate-900 text-lg tracking-tight">
                        {type.type_name}
                      </h4>
                    </div>
                    <div className="text-[15px] text-slate-600 leading-relaxed font-medium">
                      <LexicalRenderer initialState={type.about_type} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Symptoms & Diagnosis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentBlock
              icon={Activity}
              title="Common Symptoms"
              content={condition?.symptoms}
              accent="emerald"
            />
            <ContentBlock
              icon={Stethoscope}
              title="Diagnostic Procedures"
              content={condition?.diagnosis}
              accent="emerald"
            />
          </div>

          {/* Complications - Dark */}
          <ContentBlock
            icon={AlertTriangle}
            title="Critical Complications"
            content={condition?.complications}
            variant="dark"
            accent="emerald"
          />

          {/* Causes */}
          {hasCauses && (
            <section className="space-y-5">
              <SectionHeader icon={Flame} title="Etiology & Causes" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {condition.causes.map((cause: ConditionCause, i: number) => (
                  <div
                    key={cause.cause_name ?? i}
                    className="bg-white p-6 border border-slate-200 rounded-none shadow-sm"
                  >
                    <h4 className="font-black text-slate-900 text-base mb-3 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✦</span>
                      {cause.cause_name || `Cause ${i + 1}`}
                    </h4>
                    {cause.other_possible_causes && (
                      <div className="text-[14px] text-slate-600 leading-relaxed font-medium">
                        <LexicalRenderer
                          initialState={cause.other_possible_causes}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Treatment & Prevention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentBlock
              icon={Syringe}
              title="Treatment & Management"
              content={condition?.treatment}
              accent="emerald"
            />
            <ContentBlock
              icon={ShieldCheck}
              title="Prevention Strategy"
              content={condition?.prevention}
              accent="emerald"
            />
          </div>

          {/* Contact & Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentBlock
              icon={Phone}
              title="Medical Advice"
              content={condition?.contact_your_doctor}
              accent="emerald"
              compact
            />
            <ContentBlock
              icon={Star}
              title="Data Attribution"
              content={condition?.attribution}
              accent="emerald"
              compact
            />
          </div>

          {/* Resources */}
          {hasLexicalContent(condition?.more_information) && (
            <ContentBlock
              icon={BookOpen}
              title="Additional Resources"
              content={condition?.more_information}
              accent="emerald"
              compact
            />
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Reference Database
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              ID: {condition.id.slice(0, 8)}…
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
      className={`${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"} 
        ${compact ? "p-6" : "p-6 md:p-8"} 
        border border-slate-200 rounded-none shadow-sm relative overflow-hidden`}
    >
      {isDark && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      )}

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-none ${isDark ? "bg-white/10 text-emerald-400" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h3
            className={`font-black uppercase tracking-[0.15em] ${compact ? "text-xs" : "text-sm"} ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {title}
          </h3>
        </div>

        <div
          className={`${isDark ? "text-slate-300" : "text-slate-600"} text-[15px] leading-[1.7] ${compact ? "" : "md:pl-[3.25rem]"}`}
        >
          {!isEmpty ? (
            <LexicalRenderer initialState={content} />
          ) : (
            <div
              className={`flex items-center gap-3 p-4 rounded-none border italic text-sm font-medium ${isDark ? "bg-white/5 border-white/10 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"}`}
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
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
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
      <div className="h-[280px] w-full bg-slate-100 flex flex-col items-center justify-center border border-slate-200 rounded-none">
        <User className="h-10 w-10 text-slate-300 mb-3" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          No Visual Reference
        </span>
      </div>
    );
  }

  const currentSrc = getPublicImageUrl(images[activeIndex]);

  return (
    <div className="space-y-4">
      {/* Main Image — guarded so src is never "" */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden group">
        {currentSrc ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              // className="absolute inset-0"
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

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black text-white tracking-widest rounded-none">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
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
                className={`relative w-16 h-16 shrink-0 border-2 overflow-hidden rounded-none transition-all ${activeIndex === i ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200 hover:border-slate-300"}`}
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
