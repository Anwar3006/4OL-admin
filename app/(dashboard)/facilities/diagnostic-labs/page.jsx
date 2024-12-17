"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import DiagnosticLabsListing from "@/components/partials/auth/Facilities/DiagnosticLabs/DianosticLabsListing";

const DiagnosticLabs = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <DiagnosticLabsListing />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiagnosticLabs;
