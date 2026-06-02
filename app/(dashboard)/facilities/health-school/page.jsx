// Individual Business Provider Page
"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import HealthSchoolListing from "@/components/redesign/auth/Facilities/HealthSchool/HealthSchoolListing";

const HealthSchoolPage = () => {
  const [isDark] = useDarkmode();
  return (
    <div className="mt-5 relative">
      {/* <HealthSchoolListing /> */}
    </div>
  );
};

export default HealthSchoolPage;
