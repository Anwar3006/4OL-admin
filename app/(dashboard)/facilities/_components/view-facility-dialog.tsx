"use client";

import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useAddFacilityDialog,
  useGalleryModal,
  useViewFacilityDialog,
} from "@/stores/dialog-store";
import BusinessHoursDisplay from "@/app/(dashboard)/facilities/_components/business-hours-display";
import { isMediaVideo } from "@/components/ImageDropZone";
import { Button } from "@/components/ui/button";
import { toUppercaseFirstLetter } from "@/lib/utils";
import {
  useApproveFacility,
  useFacilityProfile,
  useRejectFacility,
} from "@/hooks/supabase-calls/useFacilities";

import { TFacilityProfileOutput } from "@/schemas/facility-profile.schema";
import { WhatsAppIcon } from "@/public/assets/images/icon/whatsapp";
import { useMemo } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { FacilityRatingSection } from "./facility-rating";
import { useAdminFacilityAudit } from "@/hooks/supabase-calls/useReviews";
import { GalleryModal } from "@/components/GalleryModal";

export default function FacilityViewDialog() {
  const { isOpen, entityId, close } = useViewFacilityDialog();
  const { open: openEdit } = useAddFacilityDialog();
  const { open: openGallery } = useGalleryModal();
  const { user } = useSupabaseSession();

  const { data: facility, isLoading } = useFacilityProfile(entityId || "");
  const { mutate: approve, isPending: isApproving } = useApproveFacility();
  const { mutate: reject, isPending: isRejecting } = useRejectFacility();
  const { data: auditData } = useAdminFacilityAudit(entityId || "");

  const canManage = useMemo(() => {
    return user?.role === "super_admin" || user?.role === "admin";
  }, [user]);

  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    if (path.startsWith("http")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/facility-media/${path}`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate">
                {facility?.facility_name || "Facility Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white">
                  {facility?.facility_type?.replace(/_/g, " ")}
                </Badge>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3" />
                  {facility?.region}, {facility?.district}
                </span>
              </div>
            </div>
            {facility?.status && (
              <Badge
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                  facility.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {facility.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : facility ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" /> General Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <InfoRow label="Email" value={facility.email} icon={Mail} />
                        <InfoRow label="Phone" value={facility.contact_number} icon={Phone} />
                        <InfoRow label="Digital Address" value={facility.digital_address} icon={MapPin} />
                        <InfoRow label="Website" value={facility.website} icon={Globe} isLink />
                      </div>
                    </section>

                    <Separator />

                    <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                        Business Hours
                      </h3>
                      <BusinessHoursDisplay hours={facility.business_hours} />
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Validation Details
                      </h3>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                        <InfoRow label="HEFRA ID" value={facility.hefra_id} icon={ShieldCheck} />
                        <InfoRow label="HCP Name" value={facility.hcp_name} icon={User} />
                        <InfoRow label="HCP License" value={facility.hcp_license_number} icon={FileText} />
                      </div>
                    </section>

                    {facility.facility_images?.length > 0 && (
                      <section>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                          Gallery ({facility.facility_images.length})
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {facility.facility_images.slice(0, 3).map((img: string, i: number) => (
                            <button
                              key={i}
                              className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                              onClick={() => openGallery(facility.facility_images, i)}
                            >
                              <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>

                <Separator />

                <FacilityRatingSection facilityId={facility.id} />
              </>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Facility not found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {facility && canManage && (
          <div className="p-6 border-t bg-slate-50/50 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={() => openEdit(facility)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Facility
            </Button>
            {facility.status === "pending" && (
              <>
                <Button
                  className="flex-1 h-11 font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => approve(facility.id)}
                  disabled={isApproving}
                >
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Facility"}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
                  onClick={() => reject(facility.id)}
                  disabled={isRejecting}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
        <GalleryModal />
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, icon: Icon, isLink }: any) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        {isLink ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline truncate">
            {value}
          </a>
        ) : (
          <span className="text-xs font-bold text-slate-700 truncate">{value}</span>
        )}
      </div>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
