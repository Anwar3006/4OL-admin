"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import PhysiotherapyListing from "@/components/redesign/auth/Facilities/Physiotherapy/PhysiotherapyListing";

const Physiotherapy = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        {/* <PhysiotherapyListing /> */}
      </div>
    </>
  );
};

export default Physiotherapy;
