"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import PharmaciesListing from "@/components/partials/auth/Facilities/Pharmacies/PharmaciesListing";

const Pharmacies = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <PharmaciesListing />
      </div>
    </>
  );
};

export default Pharmacies;
