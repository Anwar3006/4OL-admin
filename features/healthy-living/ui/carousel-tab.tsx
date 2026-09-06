"use client";

/**
 * Healthy Living Carousel tab (Analytics/Carousels build, Phase 5b).
 * Parity with the Diseases carousel-tab via the shared CarouselManager.
 * Slots are enforced server-side by PUT /api/healthy-living/[id]/feature
 * (healthyliving.feature RBAC, cap = 12). The featured set feeds the mobile
 * home carousel through get_home_carousel().
 */

import React from "react";
import CarouselManager from "@/components/redesign/carousel-manager";
import {
  useFeatureHealthyLiving,
  useHealthyLivingCarousel,
} from "@/features/healthy-living/data/useHealthyLiving";

const HealthyLivingCarouselTab = () => {
  const { data, isLoading } = useHealthyLivingCarousel();
  const { mutate: setFeatured, isPending } = useFeatureHealthyLiving();

  return (
    <CarouselManager
      entityLabel="article"
      featured={data?.featured ?? []}
      available={data?.available ?? []}
      isLoadingFeatured={isLoading}
      isLoadingAvailable={isLoading}
      isPending={isPending}
      onSetFeatured={setFeatured}
    />
  );
};

export default HealthyLivingCarouselTab;
