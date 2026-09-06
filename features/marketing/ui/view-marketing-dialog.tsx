"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import Image from "next/image";
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
import { useViewMarketingDialog } from "@/features/marketing/data/dialog-hooks";
import { isMediaVideo } from "@/components/ImageDropZone";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  useMarketingProfile,
  useUpdateMarketingProfile,
  useDeleteMarketingProfile,
} from "@/features/marketing/data/useMarketing";
import { useAddMarketingDialog } from "@/features/marketing/data/dialog-hooks";
import { toast } from "sonner";

export function ViewMarketingDialog() {
  const { isOpen, entityId, close } = useViewMarketingDialog();

  const { data: campaign, isLoading } = useMarketingProfile({
    id: entityId || "",
    enabled: !!entityId,
  });

  const { mutate: updateCampaign } = useUpdateMarketingProfile();
  const { mutate: deleteCampaign } = useDeleteMarketingProfile();
  const { open: openEdit } = useAddMarketingDialog();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = () => {
    if (campaign) {
      openEdit(campaign);
      close();
    }
  };

  const handleDelete = () => {
    if (entityId && campaign?.imageUrl) {
      deleteCampaign(
        {
          id: entityId,
          imageUrl: campaign.imageUrl,
        },
        {
          onSuccess: () => {
            setIsDeleteDialogOpen(false);
            close();
            toast.success("Campaign deleted successfully");
          },
        }
      );
    }
  };

  const toggleCampaignStatus = () => {
    if (!campaign || !entityId) return;

    let newStatus = campaign.status;
    if (campaign.status === "live") newStatus = "paused";
    else if (campaign.status === "paused") newStatus = "live";
    else if (campaign.status === "draft") newStatus = "live";

    updateCampaign(
      { id: entityId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success(`Campaign ${newStatus} successfully`);
        },
      }
    );
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketing-media/${path}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <CampaignSkeleton />
          ) : campaign ? (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold leading-none mb-1">
                      {campaign.headline}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {campaign.marketingType} • ID: {campaign.id.substring(0, 8)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                      campaign.status === "live"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {MarketingStatusMap[campaign.status]}
                  </Badge>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 font-bold uppercase tracking-widest text-[10px]"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Campaign
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 font-bold uppercase tracking-widest text-[10px]"
                    onClick={toggleCampaignStatus}
                  >
                    {campaign.status === "live" ? (
                      <><Pause className="h-4 w-4 mr-2" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Resume</>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Card className="overflow-hidden border-none bg-muted/30 shadow-none">
                  {campaign.imageUrl ? (
                    <div className="relative aspect-video w-full bg-black/5">
                      <Image
                        src={getImageUrl(campaign.imageUrl)}
                        alt={campaign.headline}
                        fill
                        sizes="(min-width: 768px) 520px, 90vw"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center bg-muted">
                      <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground mt-2">No Image Provided</span>
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                      <Info className="h-4 w-4" />
                      About this Campaign
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {campaign.description || "No description provided."}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Campaign
            </DialogTitle>
            <DialogDescription className="py-3">
              Are you sure you want to delete <span className="font-semibold text-black">"{campaign?.headline}"</span>? This action is permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CampaignSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold">Not found</h3>
      <p className="text-sm text-muted-foreground">The requested campaign could not be found.</p>
    </div>
  );
}
