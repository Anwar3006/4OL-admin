"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Building2,
  Edit,
  Trash2,
  Pause,
  Play,
  FileText,
  Info,
  Globe,
  Ban,
} from "lucide-react";
import { MarketingStatusMap } from "@/constants/marketing.const";
import { useViewMarketingDialog } from "@/stores/dialog-store";
import { isMediaVideo } from "@/components/ImageDropZone";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useMarketingProfile,
  useUpdateMarketingProfile,
  useDeleteMarketingProfile,
} from "@/hooks/supabase-calls/useMarketing";
import { useAddMarketingDialog } from "@/stores/dialog-store";

export function ViewMarketingDialog() {
  const { isOpen, entityId, close } = useViewMarketingDialog();

  const { data: campaign, isLoading } = useMarketingProfile({
    id: entityId!,
    enabled: isOpen && !!entityId,
  });

  const { mutateAsync: updateCampaign } = useUpdateMarketingProfile();
  const { mutateAsync: deleteCampaign } = useDeleteMarketingProfile();
  const { open: openAddMarketing } = useAddMarketingDialog();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getImageUrl = (img: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${img}`;

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toggleCampaignStatus = async () => {
    if (!campaign) return;

    const now = new Date();
    const start = new Date(campaign.startDate);

    let newStatus = campaign.status;

    if (campaign.status === "draft" || campaign.status === "paused") {
      // Logic for "Start"
      if (start <= now) {
        newStatus = "live";
      } else {
        newStatus = "scheduled";
      }
    } else if (campaign.status === "live" || campaign.status === "scheduled") {
      // Logic for "Pause"
      newStatus = "paused";
    }

    if (newStatus !== campaign.status) {
      await updateCampaign({
        data: { status: newStatus },
        id: campaign.id,
      });
    }
  };

  const handleEdit = () => {
    if (!campaign) return;
    openAddMarketing(campaign);
    close();
  };

  const handleDelete = async () => {
    if (!campaign) return;
    try {
      await deleteCampaign({ id: campaign.id, imageUrl: campaign.imageUrl });
      setIsDeleteDialogOpen(false);
      close();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full sm:max-w-2xl xl:max-w-2/3 p-0 flex flex-col h-full">
        <SheetHeader>
          <VisuallyHidden.Root>
            <SheetTitle>Campaign Details for {campaign?.headline}</SheetTitle>
          </VisuallyHidden.Root>
        </SheetHeader>
        {isLoading && (
          <div className="p-6">
            <CampaignSkeleton />
          </div>
        )}{" "}
        {campaign ? (
          <>
            {/* Responsive Header Padding */}
            <SheetHeader className="p-4 md:p-6 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <SheetTitle className="text-xl md:text-2xl font-bold leading-tight">
                    {campaign.headline}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="capitalize px-2 py-0 text-[10px] md:text-xs"
                    >
                      {campaign.marketingType.replace("_", " ")}
                    </Badge>
                    <SheetDescription className="text-xs md:text-sm font-medium">
                      Campaign Review
                    </SheetDescription>
                  </div>
                </div>
                <div className="self-start sm:self-center">
                  {
                    MarketingStatusMap[
                      campaign.status as keyof typeof MarketingStatusMap
                    ]
                  }
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 space-y-8">
                {/* 1. Quick Actions - Fluid Layout */}
                <div className="grid grid-cols-3 sm:flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs md:text-sm h-9 md:h-10 hover:cursor-pointer"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-1.5 md:mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className={
                      "flex-1 text-xs md:text-sm h-9 md:h-10 hover:cursor-pointer" +
                      (campaign.status === "draft"
                        ? " bg-green-400 hover:bg-green-500"
                        : "")
                    }
                    disabled={campaign.status === "ended"}
                    onClick={toggleCampaignStatus}
                  >
                    {campaign.status === "live" ||
                    campaign.status === "scheduled" ? (
                      <>
                        <Pause className="h-4 w-4 mr-1.5 md:mr-2" /> Pause
                      </>
                    ) : campaign.status === "ended" ? (
                      <div className="text-red-500 flex items-center">
                        <Ban className="h-4 w-4 mr-1.5 md:mr-2" /> Ended
                      </div>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1.5 md:mr-2" />{" "}
                        {campaign.status === "paused" ? "Resume" : "Start"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 shrink-0 hover:cursor-pointer"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 stroke-white" />
                  </Button>
                </div>

                {/* 2. Visual Content Card */}
                <Card className="overflow-hidden border-none bg-muted/30 shadow-none">
                  {campaign.imageUrl.length > 0 ? (
                    <div className="relative aspect-video w-full bg-black/5">
                      {isMediaVideo(campaign.imageUrl) ? (
                        <video
                          src={getImageUrl(campaign.imageUrl)}
                          controls
                          className="w-full h-full object-cover transition-opacity duration-300"
                        />
                      ) : (
                        <img
                          src={getImageUrl(campaign.imageUrl)}
                          alt={campaign.headline}
                          className="w-full h-full object-cover transition-opacity duration-300"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center bg-muted">
                      <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground mt-2">
                        No Image Provided
                      </span>
                    </div>
                  )}

                  <div className="p-4 md:p-5 space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Info className="h-4 w-4" />
                      About this Campaign
                    </div>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {campaign.description ||
                        "No description provided for this campaign."}
                    </p>

                    {campaign.links && (
                      <div className="pt-4 border-t space-y-3">
                        <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Engagement Links
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            campaign.links as Record<string, string>,
                          ).map(([key, value]) => (
                            <Button
                              key={key}
                              variant="secondary"
                              size="sm"
                              className="h-8 text-xs rounded-full hover:cursor-pointer"
                            >
                              <Globe className="h-3 w-3 mr-1.5" />
                              {/* <span className="capitalize mr-1">{key}:</span> */}
                              <span className="max-w-30 truncate">{value}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 3. Metadata Grid */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Schedule & ID
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailBlock
                      label="Start Date"
                      value={formatDate(campaign.startDate)}
                      icon={Calendar}
                    />
                    <DetailBlock
                      label="End Date"
                      value={formatDate(campaign.endDate)}
                      icon={Calendar}
                    />
                    <DetailBlock
                      label="Organization"
                      value={campaign.organization || "N/A"}
                      icon={Building2}
                    />
                    {/* <DetailBlock
                      label="Created"
                      value={new Date(campaign.created_at).toLocaleDateString()}
                      icon={FileText}
                    /> TODO: add createdAt field to campaign output */}
                  </div>
                </div>

                {/* <div className="rounded-lg bg-orange-50 p-3 border border-orange-100 flex items-start gap-3">
                  <Info className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="text-[11px] text-orange-800 leading-tight">
                    Internal ID:{" "}
                    <span className="font-mono">{campaign.id}</span>
                    <br />
                    This campaign is currently visible to users in the
                    healthcare registry.
                  </div>
                </div> */}
              </div>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </SheetContent>
    </Sheet>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Campaign
            </DialogTitle>
            <DialogDescription className="py-3">
              Are you sure you want to delete <span className="font-semibold text-black">"{campaign?.headline}"</span>? This action will permanently remove the campaign and its media from our records and storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1 sm:flex-none hover:cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 sm:flex-none hover:cursor-pointer text-white"
            >
              Delete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Reusable Detail Block for Clean Grid
function DetailBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-1.5 text-xs md:text-sm font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function CampaignSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-100 text-center p-6">
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold">Campaign not found</h3>
      <p className="text-sm text-muted-foreground max-w-62.5">
        We couldn't retrieve the details. It may have been deleted or moved.
      </p>
    </div>
  );
}
