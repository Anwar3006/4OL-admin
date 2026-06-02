"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import OsteopathyListing from "@/components/redesign/auth/Facilities/Osteopathy/OsteopathyListing";

const Osteopathy = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        {/* <OsteopathyListing /> */}
      </div>
    </>
  );
};

export default Osteopathy;
