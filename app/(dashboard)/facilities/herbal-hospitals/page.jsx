"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import HerbalHospitalsListing from "@/components/partials/auth/Facilities/HerbalHospitals/HerbalHospitalsListing";

const HerbalHospitals = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <HerbalHospitalsListing />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HerbalHospitals;
