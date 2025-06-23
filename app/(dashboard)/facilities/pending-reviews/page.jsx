"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import PendingReviewList from "@/components/partials/auth/Facilities/PendingReview";

const PendingReview = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <PendingReviewList />
      </div>
    </>
  );
};

export default PendingReview;
