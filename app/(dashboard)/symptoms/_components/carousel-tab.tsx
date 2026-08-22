"use client";

/**
 * Symptoms Carousel tab (Analytics/Carousels build, Phase 5b).
 * Parity with the Diseases carousel-tab via the shared CarouselManager.
 * Slots are enforced server-side by PUT /api/symptoms/[id]/feature
 * (symptoms.feature RBAC, cap = 12). The featured set feeds the mobile
 * home carousel through get_home_carousel().
 */

import React from "react";
import CarouselManager from "@/components/redesign/carousel-manager";
import {
  useFeatureSymptom,
  useSymptomsCarousel,
} from "@/hooks/supabase-calls/useSymptoms";

const SymptomCarouselTab = () => {
  const { data, isLoading } = useSymptomsCarousel();
  const { mutate: setFeatured, isPending } = useFeatureSymptom();

  return (
    <CarouselManager
      entityLabel="symptom"
      featured={data?.featured ?? []}
      available={data?.available ?? []}
      isLoadingFeatured={isLoading}
      isLoadingAvailable={isLoading}
      isPending={isPending}
      onSetFeatured={setFeatured}
    />
  );
};

export default SymptomCarouselTab;
