"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import HerbalHospitalsListing from "@/components/partials/auth/Facilities/HerbalHospitals/HerbalHospitalsListing";

const HerbalHospitals = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <HerbalHospitalsListing />
      </div>
    </>
  );
};

export default HerbalHospitals;
