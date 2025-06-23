"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import DiagnosticLabsListing from "@/components/partials/auth/Facilities/DiagnosticLabs/DianosticLabsListing";

const DiagnosticLabs = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <DiagnosticLabsListing />
      </div>
    </>
  );
};

export default DiagnosticLabs;
