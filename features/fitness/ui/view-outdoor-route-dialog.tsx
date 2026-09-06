// view-outdoor-route-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useViewOutdoorRouteDialog, useAddOutdoorRouteDialog } from "@/features/fitness/data/dialog-hooks";
import { useFitnessOutdoorRoute } from "@/features/fitness/data/useFitnessOutdoor";
import {
  MapPin,
  Navigation,
  Clock,
  Activity,
  ShieldCheck,
  Heart,
  User,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  Ban,
  Target,
  CheckCircle2,
  Route,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicImageUrl } from "@/lib/utils";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { TopRatedToggle } from "@/components/redesign/TopRatedToggle";

// Leaflet touches `window` on import — must be dynamically imported with
// ssr: false or Next.js's server render throws "window is not defined".
const RouteMapPreview = dynamic(() => import("@/components/RouteMapPreview"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full bg-slate-100 animate-pulse rounded-none border border-slate-200" />
  ),
});

// Stable reference so "no gps_data" doesn't pass a fresh [] literal to
// RouteMapPreview on every render of this dialog.
const EMPTY_ROUTE_POINTS: [number, number][] = [];

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

const ViewOutdoorRouteDialog = () => {
  const { isOpen, close, entityId } = useViewOutdoorRouteDialog();
  const { open: openAdd } = useAddOutdoorRouteDialog();
  const { data, isLoading } = useFitnessOutdoorRoute(entityId!);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Guard against empty / null image URLs
  const rawImages = data?.image_url || [];
  const images = Array.isArray(rawImages)
    ? rawImages.filter(
        (url): url is string =>
          typeof url === "string" && url.trim().length > 0,
      )
    : [];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {data?.name ? `Details for ${data.name}` : "Route Details"}
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
        title="Delete Outdoor Route"
        itemName={data?.name || ""}
        itemType="outdoor route"
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
          <Route className="h-8 w-8 text-emerald-600 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Loading Route Data
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
          Route Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This outdoor route may have been deleted or moved. Please return to
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

  const statusColor = data.is_active
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-50 text-slate-600 border-slate-200";

  const verificationColor =
    data.verification_status === "approved"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-none border border-emerald-100">
            <Route className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
              {data.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              Outdoor Route
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data.is_active !== undefined && (
            <Badge
              className={`hidden sm:inline-flex rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border ${statusColor}`}
            >
              {data.is_active ? "Active" : "Inactive"}
            </Badge>
          )}

          {data.verification_status && (
            <Badge
              className={`hidden sm:inline-flex rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border ${verificationColor}`}
            >
              {data.verification_status.replace("_", " ")}
            </Badge>
          )}

          <TopRatedToggle
            compact
            module="outdoor_route"
            itemId={data.id}
            title={data.name}
            subtitle={data.category}
            imageUrl={Array.isArray(data.image_url) ? data.image_url[0] : data.image_url}
          />

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
            {/* Left: Meta & Stats */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={`rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border ${statusColor}`}
                  >
                    <Target className="h-3 w-3 mr-1.5" />
                    {data.category || "General Trail"}
                  </Badge>
                  {data.surface_type && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 text-slate-500"
                    >
                      {data.surface_type}
                    </Badge>
                  )}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                <MetaPill
                  icon={Navigation}
                  label="Distance"
                  value={data.distance_km ? `${data.distance_km} km` : "N/A"}
                />
                <MetaPill
                  icon={Clock}
                  label="Duration"
                  value={
                    data.estimated_duration_mins
                      ? `${data.estimated_duration_mins} mins`
                      : "N/A"
                  }
                />
                <MetaPill
                  icon={Activity}
                  label="Difficulty"
                  value={data.difficulty || "Low"}
                />
                <MetaPill
                  icon={Heart}
                  label="Surface"
                  value={data.surface_type || "Natural"}
                />
              </div>
            </div>

            {/* Right: Image Gallery */}
            <div className="lg:col-span-5 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 md:p-10">
              {images.length > 0 ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden group">
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
                            alt={data.name}
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

                    {images.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black text-white tracking-widest rounded-none">
                        {activeImage + 1} / {images.length}
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      {images.map((img, i) => {
                        const thumbSrc = getPublicImageUrl(img);
                        if (!thumbSrc) return null;
                        return (
                          <button
                            key={i}
                            onClick={() => onSelectImage(i)}
                            className={`relative w-16 h-16 shrink-0 border-2 overflow-hidden rounded-none transition-all ${
                              activeImage === i
                                ? "border-emerald-500 ring-1 ring-emerald-500"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Image
                              src={thumbSrc}
                              alt={`${data.name} thumb ${i + 1}`}
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
              ) : (
                <div className="h-[280px] w-full bg-slate-100 flex flex-col items-center justify-center border border-slate-200 rounded-none">
                  <MapPin className="h-10 w-10 text-slate-300 mb-3" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    No Route Images
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Location */}
          {(data.area || data.region) && (
            <section className="space-y-5">
              <SectionHeader icon={MapPin} title="Location" />
              <div className="bg-white p-6 border border-slate-200 rounded-none shadow-sm">
                <p className="text-[15px] text-slate-600 leading-relaxed font-medium">
                  {[data.area, data.region].filter(Boolean).join(", ")}
                </p>
              </div>
            </section>
          )}

          {/* Route Map */}
          <section className="space-y-5">
            <SectionHeader icon={Route} title="Route Map" />
            <RouteMapPreview
              points={data.gps_data?.points ?? EMPTY_ROUTE_POINTS}
              strokeColor="#10B981"
              heightClassName="h-80"
            />
            {data.gps_data?.pointCount && (
              <p className="text-slate-500 text-xs font-semibold">
                {data.gps_data.pointCount.toLocaleString()} GPS points •{" "}
                {data.gps_data.distanceKm ?? data.distance_km ?? "--"} km
                tracked
              </p>
            )}
          </section>

          {/* Features & Reward */}
          {(data.features?.length > 0 ||
            data.fitcoins_reward ||
            data.registered_by) && (
            <section className="space-y-5">
              <SectionHeader icon={ShieldCheck} title="Features & Rewards" />
              <div className="bg-white p-6 border border-slate-200 rounded-none shadow-sm space-y-4">
                {data.features?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.features.map((f: string) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-emerald-200 text-emerald-700 bg-emerald-50"
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-6 text-sm">
                  {data.fitcoins_reward != null && (
                    <p className="text-slate-600 font-medium">
                      <span className="font-black text-slate-900">
                        {data.fitcoins_reward}
                      </span>{" "}
                      FitCoins per completion
                    </p>
                  )}
                  {data.registered_by && (
                    <p className="text-slate-600 font-medium">
                      Registered by{" "}
                      <span className="font-black text-slate-900">
                        {data.registered_by}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Creator & Verifier */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="space-y-5">
              <SectionHeader icon={User} title="Created By" />
              <div className="bg-white p-6 border border-slate-200 rounded-none shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 flex items-center justify-center rounded-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {data.creator
                      ? `${data.creator.first_name || ""} ${data.creator.last_name || ""}`.trim()
                      : "System"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Route Creator
                  </p>
                </div>
              </div>
            </section>

            {data.verified_by && (
              <section className="space-y-5">
                <SectionHeader icon={ShieldCheck} title="Verified By" />
                <div className="bg-white p-6 border border-slate-200 rounded-none shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 flex items-center justify-center rounded-none">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {data.verifier
                        ? `${data.verifier.first_name || ""} ${data.verifier.last_name || ""}`.trim()
                        : "Admin"}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Route Verifier
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Gallery Grid */}
          {images.length > 1 && (
            <section className="space-y-5">
              <SectionHeader icon={MapPin} title="Route Gallery" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, i) => {
                  const src = getPublicImageUrl(img);
                  if (!src) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectImage(i)}
                      className="relative aspect-video w-full bg-slate-100 border border-slate-200 rounded-none overflow-hidden group"
                    >
                      <Image
                        src={src}
                        alt={`${data.name} gallery ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Outdoor Routes
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

export default ViewOutdoorRouteDialog;
