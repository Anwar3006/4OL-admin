// Individual Business Provider Page
"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import HospitalsListing from "@/components/partials/auth/Facilities/Hospitals/HospitalListing";

const Hospitals = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <HospitalsListing />
      </div>
    </>
  );
};

export default Hospitals;