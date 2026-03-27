"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, Sparkles, Loader2 } from "lucide-react";
import { useFacilityToggleDialog } from "@/stores/dialog-store";
import {
  useToggleFacilityFeatured,
  useToggleFacilityTopRated,
} from "@/hooks/supabase-calls/useFacilities";

const FacilityToggleModal = () => {
  const { isOpen, close, data } = useFacilityToggleDialog();
  const { mutate: toggleFeatured, isPending: togglingFeatured } =
    useToggleFacilityFeatured();
  const { mutate: toggleTopRated, isPending: togglingTopRated } =
    useToggleFacilityTopRated();

  if (!data) return null;

  const handleFeaturedChange = (checked: boolean) => {
    toggleFeatured({ id: data.id, value: checked });
  };

  const handleTopRatedChange = (checked: boolean) => {
    toggleTopRated({ id: data.id, value: checked });
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md p-0 border-none shadow-2xl">
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-lg font-bold text-gray-900">
              {data.facility_name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {data.facility_type?.replace(/_/g, " ")} &bull; {data.region}
            </p>
          </DialogHeader>

          {/* Toggles */}
          <div className="p-6 space-y-5">
            {/* Featured Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <Label
                    htmlFor="toggle-featured"
                    className="text-sm font-semibold text-gray-800 cursor-pointer"
                  >
                    Featured
                  </Label>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Show this facility in the featured section
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {togglingFeatured && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  id="toggle-featured"
                  checked={!!data.is_featured}
                  onCheckedChange={handleFeaturedChange}
                  disabled={togglingFeatured}
                />
              </div>
            </div>

            {/* Top Rated Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                  <Star className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <Label
                    htmlFor="toggle-top-rated"
                    className="text-sm font-semibold text-gray-800 cursor-pointer"
                  >
                    Top Rated
                  </Label>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Show this facility in the top rated section
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {togglingTopRated && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  id="toggle-top-rated"
                  checked={!!data.is_top_rated}
                  onCheckedChange={handleTopRatedChange}
                  disabled={togglingTopRated}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FacilityToggleModal;
