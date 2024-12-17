"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import PendingReviewList from "@/components/partials/auth/Facilities/PendingReview";

const PendingReview = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <PendingReviewList />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PendingReview;
