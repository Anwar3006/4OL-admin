"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import DentalListing from "@/components/redesign/auth/Facilities/Dental/DentalListing";

const Dental = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        {/* <DentalListing /> */}
      </div>
    </>
  );
};

export default Dental;
