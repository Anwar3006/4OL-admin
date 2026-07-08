// view-facility-dialog.tsx
"use client";

import {
  Building2,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  X,
  HeartPulse,
  Clock,
  Star,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useAddFacilityDialog,
  useGalleryModal,
  useViewFacilityDialog,
} from "@/stores/dialog-store";
import BusinessHoursDisplay from "@/app/(dashboard)/facilities/_components/business-hours-display";
import {
  useApproveFacility,
  useFacilityProfile,
  useRejectFacility,
} from "@/hooks/supabase-calls/useFacilities";
import { useMemo, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { FacilityRatingSection } from "./facility-rating";
import { useAdminFacilityAudit } from "@/hooks/supabase-calls/useReviews";
import { GalleryModal } from "@/components/GalleryModal";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { getPublicImageUrl } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */

interface FacilityData {
  id: string;
  facility_name: string;
  facility_type: string;
  region: string;
  district: string;
  status: string;
  email?: string;
  contact_number?: string;
  gps_address?: string;
  website?: string;
  media_urls?: string[];
  featured_image_url?: string;
  business_hours?: any[];
  [key: string]: any;
}

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */

export default function FacilityViewDialog() {
  const { isOpen, entityId, close } = useViewFacilityDialog();
  const { open: openEdit } = useAddFacilityDialog();
  const { open: openGallery } = useGalleryModal();
  const { data: session } = useSupabaseSession();

  const { data: facility, isLoading } = useFacilityProfile({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });

  const { mutate: approve, isPending: isApproving } = useApproveFacility();
  const { mutate: reject, isPending: isRejecting } = useRejectFacility();
  const { data: auditData } = useAdminFacilityAudit({
    facilityId: entityId || "",
    adminId: session?.user?.id || "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const canManage = useMemo(() => {
    return (
      session?.user?.role === "super_admin" || session?.user?.role === "admin"
    );
  }, [session?.user]);

  // Guard against empty / null image URLs
  const images = useMemo(() => {
    if (!facility?.media_urls || !Array.isArray(facility.media_urls)) return [];
    return facility.media_urls.filter(
      (url): url is string => typeof url === "string" && url.trim().length > 0,
    );
  }, [facility?.media_urls]);

  // const getImageUrl = (path: string) => {
  //   if (!path) return "";
  //   if (path.startsWith("http")) return path;
  //   return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/facility-media/${path}`;
  // };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 flex flex-col bg-slate-50 border-0 shadow-2xl rounded-none max-h-[95vh] overflow-hidden max-w-5xl">
        <VisuallyHidden.Root>
          <DialogTitle>
            {facility?.facility_name
              ? `Details for ${facility.facility_name}`
              : "Facility Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <LoadingState />
        ) : facility ? (
          <DetailView
            facility={facility}
            images={images}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
            onEdit={() => openEdit(facility)}
            onDelete={() => setShowDeleteModal(true)}
            onClose={close}
            onOpenGallery={(imgs: string[]) => openGallery(imgs)}
            canManage={canManage}
            session={session}
            auditData={auditData}
            isApproving={isApproving}
            isRejecting={isRejecting}
            onApprove={() =>
              approve({
                adminId: session?.user?.id || "",
                id: facility.id,
                media_urls: facility.media_urls || [],
                featured_image_url: facility.featured_image_url,
              })
            }
            onReject={() =>
              reject({
                adminId: session?.user?.id || "",
                id: facility.id,
                media_urls: facility.media_urls || [],
                featured_image_url: facility.featured_image_url,
              })
            }
            getImageUrl={getPublicImageUrl}
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
        title="Delete Facility"
        itemName={facility?.facility_name || ""}
        itemType="facility"
      />
      <GalleryModal />
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
          <Building2 className="h-8 w-8 text-emerald-600 animate-pulse" />
        </div>
      </div>
      <span className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
        Loading Facility Profile
      </span>
    </div>
  );
}

function NotFoundState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6 bg-white">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
        <AlertCircle className="h-10 w-10 text-slate-300" />
      </div>
      <div className="space-y-2">
        <p className="text-slate-900 font-black text-xl tracking-tight">
          Facility Not Found
        </p>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          This facility record may have been deleted or moved. Please return to
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
  facility,
  images,
  activeImage,
  onSelectImage,
  onEdit,
  onDelete,
  onClose,
  onOpenGallery,
  canManage,
  auditData,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
  getImageUrl,
  session,
}: {
  facility: FacilityData;
  images: string[];
  activeImage: number;
  onSelectImage: (i: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenGallery: (imgs: string[]) => void;
  canManage: boolean;
  auditData: any;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  getImageUrl: (path: string) => string;
  session: any;
}) {
  const currentImageSrc = images[activeImage]
    ? getImageUrl(images[activeImage])
    : "";

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* ── Sticky Top Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 md:px-10 md:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden md:flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-none border border-emerald-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
              {facility.facility_name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
              {facility.facility_type?.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {facility.status && (
            <Badge
              className={`hidden sm:inline-flex rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 ${
                facility.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : facility.status === "pending"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {facility.status}
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
            {/* Left: Meta & Info */}
            <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-none">
                    <MapPin className="h-3 w-3 mr-1.5" />
                    {facility.region}, {facility.district}
                  </Badge>
                  {facility.gps_address && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-slate-200 text-slate-500"
                    >
                      {facility.gps_address}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  {facility.facility_name}
                </DialogTitle>

                {facility.facility_type && (
                  <p className="text-[15px] text-slate-600 leading-relaxed font-medium capitalize">
                    {facility.facility_type.replace(/_/g, " ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <MetaPill
                  icon={Phone}
                  label="Contact"
                  value={facility.contact_number || "N/A"}
                />
                <MetaPill
                  icon={Mail}
                  label="Email"
                  value={facility.email || "N/A"}
                />
                <MetaPill
                  icon={Globe}
                  label="Website"
                  value={facility.website || "N/A"}
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
                            alt={`${facility.facility_name} image ${activeImage + 1}`}
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

                    {/* Gallery trigger overlay */}
                    <button
                      onClick={() => onOpenGallery(images)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
                    >
                      <span className="bg-white/90 text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-none">
                        View Gallery
                      </span>
                    </button>
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
                              alt={`${facility.facility_name} thumb ${i + 1}`}
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
                  <Building2 className="h-10 w-10 text-slate-300 mb-3" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    No Images
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 md:p-10 space-y-10">
          {/* Business Hours */}
          {facility.business_hours && facility.business_hours.length > 0 && (
            <section className="space-y-5">
              <SectionHeader icon={Clock} title="Operating Hours" />
              <BusinessHoursDisplay businessHours={facility.business_hours} />
            </section>
          )}

          {/* Rating Section */}
          <FacilityRatingSection
            facility={facility}
            adminId={session?.user?.id || ""}
            auditData={auditData}
          />
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-6 md:px-10 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ghana Health Tech Facility Directory
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              ID: {facility.id.slice(0, 8)}…
            </p>
          </div>
        </footer>
      </div>

      {/* Admin Action Bar */}
      {canManage && facility.status === "pending" && (
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 md:px-10 md:py-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 font-black uppercase tracking-widest text-[10px] rounded-none border-slate-200 hover:bg-slate-50"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            className="flex-1 h-11 font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-none transition-all active:scale-95"
            onClick={onApprove}
            disabled={isApproving}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-11 font-black uppercase tracking-widest text-[10px] rounded-none"
            onClick={onReject}
            disabled={isRejecting}
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </>
            )}
          </Button>
        </div>
      )}
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
      <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
    </div>
  );
}
