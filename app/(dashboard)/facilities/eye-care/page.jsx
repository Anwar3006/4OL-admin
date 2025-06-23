"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import EyeCareListing from "@/components/partials/auth/Facilities/EyeCare/EyeCareListing";

const EyeCare = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <EyeCareListing />
      </div>
    </>
  );
};

export default EyeCare;
