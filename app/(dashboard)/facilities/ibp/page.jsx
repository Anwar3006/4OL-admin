// Individual Business Provider Page
"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import IBPListing from "@/components/redesign/auth/Facilities/IBP/IBPListing";

const IBP = () => {
  const [isDark] = useDarkmode();
  return (
    <div className="mt-5 relative">
      {/* <IBPListing /> */}
    </div>
  );
};

export default IBP;
