"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import ProstheticsListing from "@/components/redesign/auth/Facilities/Prosthetics/ProstheticsListing";

const Prosthetics = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        {/* <ProstheticsListing /> */}
      </div>
    </>
  );
};

export default Prosthetics;
