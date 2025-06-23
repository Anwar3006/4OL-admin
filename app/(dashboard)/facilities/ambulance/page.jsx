"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import AmbulanceListing from "@/components/partials/auth/Facilities/Ambulance/AmbulanceListing";

const Ambulance = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <AmbulanceListing />
      </div>
    </>
  );
};

export default Ambulance;
