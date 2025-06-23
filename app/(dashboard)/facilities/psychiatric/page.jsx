"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import PsychiatricListing from "@/components/partials/auth/Facilities/Psychiatric/PsychiatricListing";

const Psychiatric = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <PsychiatricListing />
      </div>
    </>
  );
};

export default Psychiatric;
