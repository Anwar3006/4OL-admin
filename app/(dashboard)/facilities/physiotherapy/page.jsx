"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import DentalListing from "@/components/partials/auth/Facilities/Dental/DentalListing";
import PhysiotherapyListing from "@/components/partials/auth/Facilities/Physiotherapy/PhysiotherapyListing";

const Physiotherapy = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <PhysiotherapyListing />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Physiotherapy;
