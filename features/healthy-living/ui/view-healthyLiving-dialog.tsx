"use client";

import React, { memo, useState } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAddHealthyLivingDialog, useViewHealthyLivingDialog } from "@/features/healthy-living/data/dialog-hooks";
import {
  useDeleteHealthyLiving,
  useHealthyLiving,
} from "@/features/healthy-living/data/useHealthyLiving";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { hasLexicalContent, getPublicImageUrl } from "@/lib/utils";
import {
  Ban,
  Calendar,
  Eye,
  FolderOpen,
  HeartPulse,
  Info,
  Leaf,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const LexicalRenderer = dynamic(
  () =>
    import("@/components/LexicalRenderer").then((mod) => mod.LexicalRenderer),
  { ssr: false },
);

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */

interface ContentSection {
  key: string;
  label: string;
  content: any;
}

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewHealthyLivingDialog = () => {
  const { isOpen, entityId, close } = useViewHealthyLivingDialog();
  const addDialog = useAddHealthyLivingDialog();

  const { data, isLoading } = useHealthyLiving(
    isOpen ? (entityId as string) : null,
  );
  const { mutateAsync: deleteHealthyLiving } = useDeleteHealthyLiving();

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
    addDialog.open(data);
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleDeleteConfirm = async () => {
    if (!data?.id) return;
    await deleteHealthyLiving(data.id);
    setShowDeleteModal(false);
    close();
  };

  const handleDeleteCancel = () => setShowDeleteModal(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.name ? `Details for ${data.name}` : "Healthy Living Details"}
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
        title="Delete Healthy Living Article"
        itemName={data?.name || ""}
        itemType="healthy living article"
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
          <HeartPulse className="h-8 w-8 text-emerald-600 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Retrieving Wellness Content
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
          Article Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This healthy living article may have been deleted or moved. Please
          return to the directory.
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
   Helpers
   ─────────────────────────────────────────────────────────── */

function parseMaybeString(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function getSections(content: any): ContentSection[] | null {
  const parsed = parseMaybeString(content);
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.sections)) {
    return parsed.sections;
  }
  return null;
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
  const sections = getSections(data.content);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-none border border-emerald-100">
            <Leaf className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
              {data.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Healthy Living Article
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
            {/* Left: Meta & Classification */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={`font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-none border ${
                      data.status === "published"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : data.status === "archived"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {data.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 text-slate-500"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    {data.view_count ?? 0} views
                  </Badge>
                </div>

                <DialogTitle className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  {data.name}
                </DialogTitle>

                {data.description && (
                  <p className="text-[15px] text-slate-600 leading-relaxed font-medium">
                    {data.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <MetaPill
                  icon={Leaf}
                  label="Categories"
                  value={
                    Array.isArray(data.categories) && data.categories.length > 0
                      ? data.categories
                          .map((c: any) => c.categories?.name)
                          .filter(Boolean)
                          .join(", ")
                      : "Uncategorized"
                  }
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
                  icon={Eye}
                  label="Total Views"
                  value={String(data.view_count ?? 0)}
                />
              </div>
            </div>

            {/* Right: Image Gallery */}
            <div className="lg:col-span-5 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 md:p-10">
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
          {/* Sectioned content */}
          {sections ? (
            sections.map((section: ContentSection, index: number) => (
              <ContentBlock
                key={section.key || index}
                icon={Info}
                title={section.label || "Content"}
                content={section.content}
                accent="emerald"
              />
            ))
          ) : (
            <ContentBlock
              icon={Info}
              title="Content"
              content={data.content}
              accent="emerald"
            />
          )}

          {/* Attribution */}
          {hasLexicalContent(data?.attribution) && (
            <ContentBlock
              icon={Star}
              title="Attribution"
              content={data?.attribution}
              accent="emerald"
              compact
            />
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Leaf className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Wellness Library
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
  const isEmpty = !hasLexicalContent(parseMaybeString(content));
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
            <LexicalRenderer initialState={parseMaybeString(content)} />
          ) : (
            <div
              className={`flex items-center gap-3 p-4 rounded-none border italic text-sm font-medium ${isDark ? "bg-white/5 border-white/10 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"}`}
            >
              <Ban className="h-4 w-4 opacity-50 shrink-0" />
              No content provided for this section.
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
        <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          No Visual Reference
        </span>
      </div>
    );
  }

  const currentSrc = getPublicImageUrl(images[activeIndex]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden group">
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
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black text-white tracking-widest rounded-none">
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

export default memo(ViewHealthyLivingDialog);
