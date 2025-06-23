"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import HomeListing from "@/components/partials/auth/Facilities/Home/HomeListing";

const Homes = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="mt-5 relative">
        <HomeListing />
      </div>
    </>
  );
};

export default Homes;
