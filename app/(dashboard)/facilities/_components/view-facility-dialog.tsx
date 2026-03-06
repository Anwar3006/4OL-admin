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
  MailboxIcon,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { authClient } from "@/lib/auth-client";
import { FacilityRatingSection } from "./facility-rating";
import { useAdminFacilityAudit } from "@/hooks/supabase-calls/useReviews";
import { GalleryModal } from "@/components/GalleryModal";

export function FacilityViewDialog() {
  const viewDialog = useViewFacilityDialog();
  const addDialog = useAddFacilityDialog();
  const viewGallery = useGalleryModal();

  const { data: session } = authClient.useSession();

  const { data: facilityData, isLoading: isFacilityLoading } =
    useFacilityProfile({
      id: viewDialog.entityId!,
      enabled: !!viewDialog.entityId,
    });

  const getImageUrl = (img: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${img}`;

  const imageUrls = useMemo(() => {
    return facilityData?.media_urls.map(getImageUrl);
  }, [facilityData]);

  const { mutateAsync: approveFacilityMutation, isPending: isApprovePending } =
    useApproveFacility();

  const { mutateAsync: rejectFacilityMutation, isPending: isRejectPending } =
    useRejectFacility();

  const { data: adminReviews } = useAdminFacilityAudit({
    facilityId: viewDialog.entityId as string,
    adminId: session?.user.id as string,
  });

  const isLoading = isFacilityLoading;

  const facility = {
    ...facilityData,
    region: facilityData?.region
      ?.split(" ")
      .map(toUppercaseFirstLetter)
      .join(" ") as TFacilityProfileOutput["region"],
  };

  //   Approve Registered Facility
  const handleApproval = async () => {
    try {
      await approveFacilityMutation({
        adminId: session?.user.id as string,
        id: facility.id as string,
        featured_image_url: facility.featured_image_url as string,
        media_urls: facility.media_urls as string[],
      });
    } catch (error) {
      console.error("Error approving facility: ", error);
      return;
    } finally {
      viewDialog.close();
    }
  };
  const handleRejection = async () => {
    try {
      await rejectFacilityMutation({
        adminId: session?.user.id as string,
        id: facility.id as string,
        featured_image_url: facility.featured_image_url as string,
        media_urls: facility.media_urls as string[],
      });
    } catch (error) {
      console.error("Error rejecting facility: ", error);
      return;
    } finally {
      viewDialog.close();
    }
  };
  //   Edit Registered Facility
  const handleEdit = () => {
    viewDialog.close();
    addDialog.open(facilityData);
  };

  return (
    <>
      <Sheet
        open={viewDialog.isOpen}
        onOpenChange={(open) => !open && viewDialog.close()}
      >
        <SheetContent className="w-full sm:max-w-2xl xl:max-w-4xl p-0 flex flex-col overflow-x-hidden overflow-y-scroll border-l shadow-2xl">
          <SheetHeader>
            <VisuallyHidden.Root>
              <SheetTitle>
                Facility Details for {facility.facility_name}
              </SheetTitle>
            </VisuallyHidden.Root>
          </SheetHeader>
          {(() => {
            if (isLoading) {
              return (
                <div className="p-10 animate-pulse space-y-4">
                  <div className="h-64 bg-muted rounded-xl" />
                  <div className="h-10 w-1/2 bg-muted rounded" />
                  <div className="h-4 w-1/4 bg-muted rounded" />
                </div>
              );
            }

            if (facility) {
              return (
                <>
                  <ScrollArea className="flex-1">
                    {/* 1. Immersive Hero Gallery */}
                    <div className="relative group">
                      <div
                        className={`grid gap-1 p-1 bg-background ${
                          imageUrls && imageUrls.length > 1
                            ? "grid-cols-4"
                            : "grid-cols-1"
                        }`}
                      >
                        {/* Main Image */}
                        <div
                          className={
                            imageUrls && imageUrls.length > 1
                              ? "col-span-3"
                              : "col-span-4"
                          }
                        >
                          <AspectRatio
                            ratio={16 / 9}
                            className="overflow-hidden rounded-l-lg"
                          >
                            <img
                              src={getImageUrl(
                                facilityData?.media_urls[0] ?? "",
                              )}
                              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            />
                          </AspectRatio>
                        </div>
                        {/* Thumbnails */}

                        {imageUrls && imageUrls.length > 1 && (
                          <div className="col-span-1 flex flex-col gap-1">
                            {imageUrls?.slice(1, 3).map((img, i) => (
                              <AspectRatio
                                key={i}
                                ratio={4 / 3}
                                className="overflow-hidden rounded-tr-lg"
                              >
                                <img
                                  src={img}
                                  className="object-cover w-full h-full"
                                />
                              </AspectRatio>
                            ))}

                            <Button
                              type="button"
                              onClick={() => viewGallery.open(facilityData)}
                              className="flex-1 border-b-2 bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer"
                            >
                              +{(imageUrls || [])?.length - 3} More
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      {/* 2. Primary Header & Status */}
                      <header className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                              <Building2 className="w-4 h-4" />
                              {facility.facility_type?.replaceAll("_", " ")}
                            </div>
                            <SheetTitle className="text-4xl font-black tracking-tight text-foreground">
                              {facility.facility_name}
                            </SheetTitle>
                          </div>
                          <Badge
                            variant={
                              facility.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="px-4 py-1 text-sm rounded-full"
                          >
                            {facility.status?.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm">
                          {/* <div className="flex items-center"> */}
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> {facility.area},{" "}
                            {facility.region}
                          </span>
                          <span className="flex items-center gap-2">
                            <Globe className="w-4 h-4" /> {facility.country}
                          </span>
                          {/* </div> */}
                          {facility.contact_number && (
                            <span className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4" />
                              {facility.contact_number}
                            </span>
                          )}
                          {facility.whatsapp_number && (
                            <span className="flex items-center gap-2">
                              <WhatsAppIcon className="w-4 h-4" />
                              {facility.whatsapp_number}
                            </span>
                          )}
                          {facility.email && (
                            <span className="flex items-center gap-2">
                              <MailboxIcon className="w-4 h-4" />
                              {facility.email}
                            </span>
                          )}
                        </div>
                      </header>

                      <Separator className="bg-border/60" />

                      {/* 3. The Details Bento Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                            Facility Amenities
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {(facility?.amenities as string[])?.map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1.5" /> {a}
                              </Badge>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                            Facility Services
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {(facility?.services as string[])?.map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="bg-gray-600 border-primary/20 text-white hover:bg-primary/10 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1.5" /> {a}
                              </Badge>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-4">
                          <BusinessHoursDisplay
                            businessHours={facility.business_hours as any}
                          />
                        </section>
                      </div>

                      {/* 4. Owner & Governance Section (High Contrast) */}
                      <section className="bg-[#ebf9e6] border border-secondary p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-background rounded-lg shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="font-bold text-lg">
                            Ownership & Governance
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <DetailItem
                            icon={User}
                            label="Primary Contact"
                            value={`${facility.first_name} ${facility.last_name}`}
                            subValue={facility.position || "Administrator"}
                          />
                          <DetailItem
                            icon={Mail}
                            label="Official Correspondence"
                            value={facility.owner_email}
                          />
                          <DetailItem
                            icon={Phone}
                            label="Direct Line"
                            value={facility.person_contact_number}
                          />
                          <DetailItem
                            icon={Calendar}
                            label="Registration Date"
                            value={new Date(
                              facility.created_at!,
                            ).toLocaleDateString(undefined, {
                              dateStyle: "long",
                            })}
                          />
                        </div>
                      </section>

                      <Separator className="bg-border/60" />

                      <section className="space-y-6">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                          Review & Performance History
                        </h3>
                        <FacilityRatingSection
                          facility={facility}
                          adminId={session?.user.id as string}
                          // reviews={adminReviews?.myReviews ?? []} // Fetch this with a useQuery
                          auditData={adminReviews}
                        />
                      </section>

                      {/* 5. Keywords / Tags Footer */}
                      <footer className="pt-4 pb-10">
                        <div className="flex flex-wrap gap-2 opacity-60 hover:opacity-100 transition-opacity">
                          {(typeof facility.keywords === "string"
                            ? (facility.keywords as string).split(",")
                            : Array.isArray(facility.keywords)
                              ? facility.keywords
                              : []
                          )
                            .filter((k) => k && k.trim() !== "") // Remove empty strings
                            .map((k: string) => (
                              <span
                                key={k}
                                className="text-[10px] font-medium bg-gray-200 px-2 py-0.5 rounded"
                              >
                                #{k.trim()}
                              </span>
                            ))}
                        </div>
                      </footer>
                    </div>
                  </ScrollArea>

                  {/* 6. Sticky Footer Actions */}
                  {/* Sticky Footer Actions */}
                  <div className="p-4 bg-background border-t flex gap-3">
                    {facility.status === "pending" ? (
                      <>
                        <button
                          onClick={handleApproval}
                          disabled={isApprovePending}
                          className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center"
                        >
                          {isApprovePending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "Approve Registration"
                          )}
                        </button>
                        <button
                          onClick={handleRejection}
                          disabled={isRejectPending}
                          className="px-6 border border-destructive text-destructive font-bold rounded-xl hover:bg-destructive/10"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEdit}
                        className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </>
              );
            }

            return (
              <div className="p-20 text-center space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                <p className="text-muted-foreground">
                  Facility profile could not be retrieved.
                </p>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
      <GalleryModal />
    </>
  );
}

// Helper component for clean detail layouts
function DetailItem({ icon: Icon, label, value, subValue }: any) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-1 text-muted-foreground/60" />
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-widest">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}
