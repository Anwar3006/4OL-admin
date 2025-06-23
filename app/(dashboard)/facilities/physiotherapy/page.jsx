"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import DentalListing from "@/components/partials/auth/Facilities/Dental/DentalListing";
import PhysiotherapyListing from "@/components/partials/auth/Facilities/Physiotherapy/PhysiotherapyListing";

const Physiotherapy = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <PhysiotherapyListing />
      </div>
    </>
  );
};

export default Physiotherapy;
